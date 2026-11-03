import { and, eq } from "drizzle-orm"
import type Stripe from "stripe"
import { getDb } from "../../db/client"
import { bookings, departures, families, paymentLinks, payments, type Booking, type Payment, type PaymentLink } from "../../db/schema"
import { getStripe } from "../stripe"
import { payUrl, paymentLinksConfigured } from "./config"
import { failFastOnLocks, fulfilCheckoutSession } from "./fulfil"
import { isPayable, paymentTitle } from "./state"
import type { PayView } from "./store"
import { isLinkToken } from "./token"

export type StartCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "not-found" | "inactive" | "paid" | "processing" | "unavailable" }

/** How long a Checkout Session stays open: Stripe allows 30 minutes to 24 hours. */
const SESSION_SECONDS = 2 * 60 * 60
/** An open session with less than this left is replaced rather than handed to the family. */
const MIN_REUSE_MS = 5 * 60_000

const UNAVAILABLE = { ok: false, reason: "unavailable" } as const

/**
 * What stops a family from starting checkout, before Stripe is asked anything. Null = go ahead.
 * Order matters: a closed payment or a dead link is "inactive" even if money once moved.
 */
export function checkoutGate(input: {
  link: Pick<PaymentLink, "cancelledAt" | "expiresAt" | "processingSince">
  payment: Pick<Payment, "status">
  bookingStatus: Booking["status"]
  nowMs: number
}): "inactive" | "paid" | "processing" | null {
  const { link, payment, bookingStatus, nowMs } = input
  if (link.cancelledAt) return "inactive"
  if (link.expiresAt && link.expiresAt.getTime() <= nowMs) return "inactive"
  if (bookingStatus === "cancelled") return "inactive"
  if (payment.status === "cancelled" || payment.status === "waived" || payment.status === "refunded") return "inactive"
  if (payment.status === "paid") return "paid"
  if (link.processingSince) return "processing"
  return isPayable(payment.status) ? null : "inactive"
}

/** An open session can be handed back only while it still charges what the payment says. */
export function canReuseSession(
  session: Pick<Stripe.Checkout.Session, "status" | "url" | "amount_total" | "currency" | "expires_at">,
  payment: Pick<Payment, "amountCents" | "currency">,
  nowMs: number,
): boolean {
  return (
    session.status === "open" &&
    !!session.url &&
    session.amount_total === payment.amountCents &&
    session.currency === payment.currency &&
    session.expires_at * 1000 - nowMs >= MIN_REUSE_MS
  )
}

/** The Checkout Session for one payment link. The family's name and the booking ref are all it carries. */
export function buildSessionParams(
  view: {
    link: Pick<PaymentLink, "id">
    payment: Pick<Payment, "id" | "kind" | "label" | "amountCents" | "currency">
    booking: Pick<PayView["booking"], "id" | "ref">
    family: Pick<PayView["family"], "familyName" | "email" | "stripeCustomerId">
    departure: Pick<PayView["departure"], "name">
  },
  token: string,
  nowSeconds: number,
): Stripe.Checkout.SessionCreateParams {
  const { payment, booking, family, departure, link } = view
  const title = paymentTitle(payment.kind, payment.label)
  const metadata = {
    payment_id: payment.id,
    payment_link_id: link.id,
    booking_id: booking.id,
    booking_ref: booking.ref,
  }
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: payment.currency,
          unit_amount: payment.amountCents,
          product_data: {
            name: `${title} · ${departure.name}`,
            description: `Booking ${booking.ref} · ${family.familyName}`,
          },
        },
      },
    ],
    // No payment_method_types: the owner picks methods in the Stripe dashboard (cards, wallets, bank debits).
    ...(family.stripeCustomerId
      ? { customer: family.stripeCustomerId }
      : { customer_email: family.email, customer_creation: "always" as const }),
    client_reference_id: payment.id,
    metadata,
    // receipt_email makes Stripe send the family a receipt in live mode, whatever the dashboard's receipt setting.
    payment_intent_data: { metadata, description: `${booking.ref} · ${title} · ${departure.name}`, receipt_email: family.email },
    submit_type: "pay",
    expires_at: nowSeconds + SESSION_SECONDS,
    success_url: `${payUrl(token)}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${payUrl(token)}?cancelled=1`,
  }
}

/**
 * What went wrong, for the log. For a failed query that is the driver's message, not Drizzle's
 * wrapper, which prints the query's parameters: the link token among them, and tokens never go
 * in a log.
 */
function errorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "unknown error"
  return err.cause instanceof Error ? err.cause.message : err.message
}

/**
 * Stripe no longer knows the family's saved customer: it was deleted in the dashboard, or it was
 * made with test keys before the switch to live ones.
 */
export function isMissingCustomer(err: unknown): boolean {
  const e = err as { code?: unknown; param?: unknown } | null
  return !!e && e.code === "resource_missing" && e.param === "customer"
}

/**
 * After the link's open session could not be expired: hand back the session if it was paid
 * meanwhile, refuse while it may still be paid (never open a second payable session beside it),
 * and only start a new one once it is gone.
 */
export function afterFailedExpire(
  again: Pick<Stripe.Checkout.Session, "status"> | null,
): "fulfil" | "unavailable" | "create" {
  if (again?.status === "complete") return "fulfil"
  if (again?.status === "open") return "unavailable"
  return "create"
}

/** The stored session, or null when Stripe no longer knows it (for example after switching keys). */
async function retrieveSession(stripe: Stripe, id: string): Promise<Stripe.Checkout.Session | null> {
  try {
    return await stripe.checkout.sessions.retrieve(id)
  } catch (err) {
    if ((err as { code?: string }).code === "resource_missing") return null
    throw err
  }
}

/** A session that is complete answers what the family sees: money in, or a bank payment on its way. */
function completedResult(session: Pick<Stripe.Checkout.Session, "payment_status">): StartCheckoutResult {
  if (session.payment_status === "paid") return { ok: false, reason: "paid" }
  if (session.payment_status === "unpaid") return { ok: false, reason: "processing" }
  return UNAVAILABLE
}

type Outcome = { kind: "done"; result: StartCheckoutResult } | { kind: "fulfil"; session: Stripe.Checkout.Session }

/**
 * Called by the /pay action. Reuses this link's open session when its amount and currency still
 * match the payment, otherwise expires it and creates a new one. Serialised per payment with row
 * locks so two clicks can't open two sessions.
 */
export async function startCheckout(token: string): Promise<StartCheckoutResult> {
  if (!paymentLinksConfigured()) return UNAVAILABLE
  if (!isLinkToken(token)) return { ok: false, reason: "not-found" }

  try {
    const outcome = await getDb().transaction(async (tx): Promise<Outcome> => {
      const done = (result: StartCheckoutResult): Outcome => ({ kind: "done", result })
      // A second click waits a few seconds at most, then hears "try again", instead of parking a
      // pooled connection behind a checkout that is waiting on Stripe.
      await failFastOnLocks(tx)
      const nowMs = Date.now()

      const [found] = await tx
        .select({ id: paymentLinks.id, paymentId: paymentLinks.paymentId })
        .from(paymentLinks)
        .where(eq(paymentLinks.token, token))
        .limit(1)
      if (!found) return done({ ok: false, reason: "not-found" })

      // Lock order everywhere: the payment row, then the link row; read the link again once locked.
      const [payment] = await tx.select().from(payments).where(eq(payments.id, found.paymentId)).for("update")
      const [link] = await tx.select().from(paymentLinks).where(eq(paymentLinks.id, found.id)).for("update")
      if (!payment || !link) return done({ ok: false, reason: "not-found" })

      const [context] = await tx
        .select({
          booking: { id: bookings.id, ref: bookings.ref, status: bookings.status },
          family: {
            id: families.id,
            familyName: families.familyName,
            primaryContactName: families.primaryContactName,
            email: families.email,
            stripeCustomerId: families.stripeCustomerId,
          },
          departure: {
            id: departures.id,
            name: departures.name,
            journey: departures.journey,
            startsOn: departures.startsOn,
            endsOn: departures.endsOn,
          },
        })
        .from(bookings)
        .innerJoin(families, eq(families.id, bookings.familyId))
        .innerJoin(departures, eq(departures.id, bookings.departureId))
        .where(eq(bookings.id, payment.bookingId))
        .limit(1)
      if (!context) return done({ ok: false, reason: "not-found" })

      const gate = checkoutGate({ link, payment, bookingStatus: context.booking.status, nowMs })
      if (gate) return done({ ok: false, reason: gate })

      const stripe = getStripe()
      if (link.checkoutSessionId) {
        const existing = await retrieveSession(stripe, link.checkoutSessionId)
        // Already completed: the webhook has not recorded it yet, so record it now.
        if (existing?.status === "complete") return { kind: "fulfil", session: existing }
        if (existing && canReuseSession(existing, payment, nowMs)) {
          await tx.update(paymentLinks).set({ checkoutStartedAt: new Date(nowMs) }).where(eq(paymentLinks.id, link.id))
          return done({ ok: true, url: existing.url as string })
        }
        if (existing?.status === "open" && !(await tryExpire(stripe, existing.id))) {
          const again = await retrieveSession(stripe, existing.id)
          const next = afterFailedExpire(again)
          if (next === "fulfil" && again) return { kind: "fulfil", session: again }
          if (next === "unavailable") return done(UNAVAILABLE)
        }
      }

      const nowSeconds = Math.floor(nowMs / 1000)
      let session: Stripe.Checkout.Session
      try {
        session = await stripe.checkout.sessions.create(buildSessionParams({ link, payment, ...context }, token, nowSeconds))
      } catch (err) {
        const saved = context.family.stripeCustomerId
        if (!saved || !isMissingCustomer(err)) throw err
        // Forget the dead customer and let Checkout make a new one from the family's email.
        console.error("[payments] the family's Stripe customer is unknown to Stripe; creating a new one:", saved)
        await tx
          .update(families)
          .set({ stripeCustomerId: null })
          .where(and(eq(families.id, context.family.id), eq(families.stripeCustomerId, saved)))
        const family = { ...context.family, stripeCustomerId: null }
        session = await stripe.checkout.sessions.create(buildSessionParams({ link, payment, ...context, family }, token, nowSeconds))
      }
      if (!session.url) throw new Error("Stripe returned a Checkout Session without a url")
      await tx
        .update(paymentLinks)
        .set({ checkoutSessionId: session.id, checkoutStartedAt: new Date(nowMs) })
        .where(eq(paymentLinks.id, link.id))
      return done({ ok: true, url: session.url })
    })

    if (outcome.kind === "fulfil") {
      // After the transaction, so the locks are free for fulfilment to take.
      await fulfilCheckoutSession(outcome.session)
      return completedResult(outcome.session)
    }
    return outcome.result
  } catch (err) {
    console.error("[payments] startCheckout failed:", errorMessage(err))
    return UNAVAILABLE
  }
}

/** Expires a session for startCheckout: true once Stripe has closed it, false when it could not (logged). */
async function tryExpire(stripe: Stripe, sessionId: string): Promise<boolean> {
  try {
    await stripe.checkout.sessions.expire(sessionId)
    return true
  } catch (err) {
    console.error("[payments] could not expire checkout session:", sessionId, errorMessage(err))
    return false
  }
}

/** Expires an open Checkout Session so a stale link or tab can't be paid. Best effort: logs and swallows errors. */
export async function expireOpenSession(sessionId: string): Promise<void> {
  if (!process.env.STRIPE_SECRET_KEY) return
  try {
    await getStripe().checkout.sessions.expire(sessionId)
  } catch (err) {
    // Usual cause: the session already completed or expired.
    console.error("[payments] could not expire checkout session:", sessionId, errorMessage(err))
  }
}
