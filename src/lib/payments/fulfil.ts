import { and, eq, isNotNull, isNull, ne, or, sql } from "drizzle-orm"
import type Stripe from "stripe"
import { getDb } from "../../db/client"
import {
  bookings,
  families,
  interactions,
  paymentLinks,
  payments,
  type Booking,
  type Payment,
  type PaymentLink,
} from "../../db/schema"
import { formatMoney } from "../admin/format"
import { isUuid } from "../admin/forms"
import { isPayable, paymentTitle } from "./state"

/**
 * Turning what Stripe tells us into payment records. Everything here is idempotent: the webhook
 * retries, the same event can arrive twice, and the /pay return page calls it on every load.
 * Each function writes in one transaction and takes the payments row lock before any link row.
 */

export type FulfilResult = "paid" | "processing" | "extra" | "unchanged" | "missing" | "ignored"

const EXTRA_LABEL = "Second payment through a payment link — check and refund"
const ORPHAN_LABEL = "Payment through a link whose payment was deleted — check it"

type Db = ReturnType<typeof getDb>
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0]

/**
 * Makes the transaction give up after a few seconds of waiting for a row lock instead of holding
 * a pooled connection for as long as another request (a checkout waiting on Stripe) keeps it.
 * The error rolls the transaction back; callers already treat a failure as "try again".
 */
export async function failFastOnLocks(tx: Tx): Promise<void> {
  await tx.execute(sql`set local lock_timeout = '5s'`)
}

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null
  return typeof ref === "string" ? ref : ref.id
}

/** Postgres error code, looking through the wrapper Drizzle puts around driver errors. */
function pgCode(err: unknown): string | null {
  if (!err || typeof err !== "object") return null
  const e = err as { code?: unknown; cause?: unknown }
  if (typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code)) return e.code
  return pgCode(e.cause)
}

/** Today's calendar date in Pacific time, as the `date` columns store it. */
export function pacificToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** What a completed, paid session means for the payment it points at. */
export type PaidPlan =
  /** Payment is open: mark it paid. */
  | "pay"
  /** Payment was cancelled or waived while this very bank payment was clearing: the money did arrive. */
  | "reopen"
  /** Already recorded. */
  | "unchanged"
  /** Money arrived for a payment that is closed or already paid by other money: record it separately. */
  | "extra"

/**
 * `clearing` = a link of this payment is still waiting on a bank payment. Only then can money
 * from the payment's own intent arrive after the owner closed it; otherwise the same intent was
 * recorded long ago (a card payment the owner later cancelled), and a revisit changes nothing.
 */
export function planPaid(
  payment: Pick<Payment, "status" | "stripePaymentIntentId">,
  intentId: string | null,
  clearing: boolean,
): PaidPlan {
  if (isPayable(payment.status)) return "pay"
  const sameIntent = intentId !== null && payment.stripePaymentIntentId === intentId
  if (sameIntent && (payment.status === "paid" || payment.status === "refunded")) return "unchanged"
  if (sameIntent) return clearing ? "reopen" : "unchanged"
  return "extra"
}

/**
 * Whether a completed but unpaid session (a bank payment submitted, not cleared) starts the
 * "clearing" wait. Only for an open payment, and only while this session is still the one the
 * link is waiting on: a failed bank payment forgets its session, so a reload of the old return
 * page or a late completed event cannot mark it clearing again.
 */
export function startsClearing(
  payment: Pick<Payment, "status">,
  link: Pick<PaymentLink, "processingSince" | "checkoutSessionId"> | null,
  sessionId: string,
): boolean {
  return isPayable(payment.status) && !!link && !link.processingSince && link.checkoutSessionId === sessionId
}

/**
 * Whether an async_payment_failed event still has something to undo: the link is waiting on a
 * bank payment, the link points at this session, or the payment carries this session's intent.
 * Once undone, none of those hold, so a repeat of the event does nothing.
 */
export function failureApplies(
  payment: Pick<Payment, "stripePaymentIntentId">,
  link: Pick<PaymentLink, "processingSince" | "checkoutSessionId">,
  sessionId: string,
  intentId: string | null,
): boolean {
  const waiting = !!link.processingSince || link.checkoutSessionId === sessionId
  const sameIntent = intentId !== null && payment.stripePaymentIntentId === intentId
  return waiting || sameIntent
}

/** The contact-log line for a failed bank payment, by what the payment had become meanwhile. */
export function failureNote(status: Payment["status"], line: string): { summary: string; followUp: boolean } {
  if (isPayable(status)) return { summary: `Bank payment for ${line} failed; the link works again.`, followUp: true }
  if (status === "paid" || status === "refunded") {
    return {
      summary: `Check this: the bank payment for ${line} failed after the payment was marked ${status}. No money arrived through Stripe; check how it was paid.`,
      followUp: true,
    }
  }
  return { summary: `Bank payment for ${line} failed. The payment was already ${status}, so nothing else changes.`, followUp: false }
}

/** The contact-log line for money that arrived on a payment. Anything the owner should act on gets a follow-up. */
export function paidNote(input: {
  /** "Deposit $1,000.00 (booking AV-0007)", in what Stripe took. */
  line: string
  /** The status the payment had when a clearing bank payment arrived after the owner closed it. */
  reopenedFrom: Payment["status"] | null
  /** A bank payment that had been clearing: the family was told someone would write. */
  wasClearing: boolean
  bookingStatus: Booking["status"]
  /** Stripe took a different amount from what the payment said (the amount was edited while a checkout was open). */
  mismatch: { taken: { cents: number; currency: string }; recorded: { cents: number; currency: string } } | null
}): { summary: string; followUp: boolean } {
  const { line, reopenedFrom, wasClearing, bookingStatus, mismatch } = input
  const parts: string[] = []
  if (reopenedFrom) {
    parts.push(`Check this: ${line} was paid online by bank payment after it was marked ${reopenedFrom}. It is marked paid again.`)
  } else if (bookingStatus === "cancelled") {
    parts.push(`Check this: ${line} was paid online after the booking was cancelled. Refund it in Stripe if needed.`)
  } else if (wasClearing) {
    parts.push(`Bank payment cleared: ${line}. Let the family know it arrived.`)
  } else {
    parts.push(`Paid online: ${line}.`)
  }
  if (mismatch) {
    const { taken, recorded } = mismatch
    const what = `Stripe took ${formatMoney(taken.cents, taken.currency)}; the payment was ${formatMoney(recorded.cents, recorded.currency)}.`
    const next =
      taken.currency !== recorded.currency
        ? "Check what the family still owes."
        : taken.cents < recorded.cents
          ? "Request the difference."
          : "Refund the excess in Stripe if it was not meant."
    parts.push(`${what} ${next}`)
  }
  return { summary: parts.join(" "), followUp: !!reopenedFrom || bookingStatus === "cancelled" || wasClearing || !!mismatch }
}

/**
 * What a charge.refunded event changes on a payment, or null when it is already recorded. A full
 * refund of a paid payment makes it refunded; a partial one only raises the refunded amount. The
 * amount never goes down, so a late event with an older snapshot cannot undo a newer one.
 */
export function planRefund(
  payment: Pick<Payment, "status" | "amountCents" | "amountRefundedCents">,
  charge: Pick<Stripe.Charge, "refunded" | "amount_refunded">,
): { status: Payment["status"]; amountRefundedCents: number } | null {
  const target = charge.refunded ? payment.amountCents : Math.min(charge.amount_refunded, payment.amountCents)
  const amountRefundedCents = Math.max(payment.amountRefundedCents, target)
  const status = charge.refunded && payment.status === "paid" ? "refunded" : payment.status
  if (amountRefundedCents === payment.amountRefundedCents && status === payment.status) return null
  return { status, amountRefundedCents }
}

type Context = { ref: string; familyId: string; departureId: string; status: Booking["status"] }

async function bookingContext(tx: Tx, bookingId: string): Promise<Context | null> {
  const [row] = await tx
    .select({ ref: bookings.ref, familyId: bookings.familyId, departureId: bookings.departureId, status: bookings.status })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1)
  return row ?? null
}

/** The booking of an existing payment: payments.booking_id is a RESTRICT foreign key, so it exists. */
async function paymentContext(tx: Tx, payment: Pick<Payment, "bookingId">): Promise<Context> {
  return (await bookingContext(tx, payment.bookingId)) as Context
}

/** A line in the contact log. Owner follow-ups set followUpOn, which puts them on the to-do list. */
async function note(tx: Tx, ctx: Context, summary: string, followUpOn: string | null = null): Promise<void> {
  await tx.insert(interactions).values({
    familyId: ctx.familyId,
    departureId: ctx.departureId,
    kind: "note",
    summary,
    followUpOn,
  })
}

function paymentLine(payment: Pick<Payment, "kind" | "label">, cents: number, currency: string, ref: string): string {
  return `${paymentTitle(payment.kind, payment.label)} ${formatMoney(cents, currency)} (booking ${ref})`
}

/** Another payments row already carries this intent, so writing it here would break the unique index. */
async function intentUsedElsewhere(tx: Tx, paymentId: string, intentId: string | null): Promise<boolean> {
  if (!intentId) return false
  const rows = await tx
    .select({ id: payments.id })
    .from(payments)
    .where(and(eq(payments.stripePaymentIntentId, intentId), ne(payments.id, paymentId)))
    .limit(1)
  return rows.length > 0
}

/** A row this session (or its intent) already produced, so a retry does not record the money twice. */
async function alreadyRecorded(tx: Tx, sessionId: string, intentId: string | null): Promise<boolean> {
  const known = [eq(payments.stripeCheckoutSessionId, sessionId)]
  if (intentId) known.push(eq(payments.stripePaymentIntentId, intentId))
  const rows = await tx.select({ id: payments.id }).from(payments).where(or(...known)).limit(1)
  return rows.length > 0
}

/** Whether any link of the payment is waiting on a bank payment (cancelled links included: the money still comes). */
async function anyLinkClearing(tx: Tx, paymentId: string): Promise<boolean> {
  const rows = await tx
    .select({ id: paymentLinks.id })
    .from(paymentLinks)
    .where(and(eq(paymentLinks.paymentId, paymentId), isNotNull(paymentLinks.processingSince)))
    .limit(1)
  return rows.length > 0
}

/** Best effort and first come: the first completed payment gives the family its Stripe customer. */
async function attachCustomer(familyId: string, customerId: string): Promise<void> {
  try {
    await getDb()
      .update(families)
      .set({ stripeCustomerId: customerId })
      .where(and(eq(families.id, familyId), isNull(families.stripeCustomerId)))
  } catch (err) {
    // Another family already holds this customer id: leave this one without.
    if (pgCode(err) !== "23505") throw err
  }
}

function sessionIds(session: Stripe.Checkout.Session) {
  const md = session.metadata ?? {}
  return {
    paymentId: isUuid(md.payment_id) ? md.payment_id : null,
    linkId: isUuid(md.payment_link_id) ? md.payment_link_id : null,
    bookingId: isUuid(md.booking_id) ? md.booking_id : null,
  }
}

/**
 * Money arrived for a payment that is no longer in this database. When its booking is here, the
 * payment was deleted after the family went to checkout: record the money as an extra payment on
 * the booking so it is not lost. When the booking is not here either, the session belongs to
 * another environment sharing the Stripe account: "missing".
 */
async function recordOrphan(
  tx: Tx,
  session: Stripe.Checkout.Session,
  bookingId: string | null,
  intentId: string | null,
  now: Date,
): Promise<FulfilResult> {
  const amountCents = session.amount_total ?? 0
  if (session.payment_status !== "paid" || !bookingId || amountCents <= 0 || !session.currency) return "missing"
  const ctx = await bookingContext(tx, bookingId)
  if (!ctx) return "missing"
  if (await alreadyRecorded(tx, session.id, intentId)) return "unchanged"
  const currency = session.currency.toLowerCase()
  const today = pacificToday(now)
  const inserted = await tx
    .insert(payments)
    .values({
      bookingId,
      kind: "extra",
      label: ORPHAN_LABEL,
      status: "paid",
      method: "stripe",
      amountCents,
      currency,
      dueOn: today,
      paidAt: now,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: intentId,
      notes: "Arrived through a payment link after the payment it was for had been deleted.",
    })
    .onConflictDoNothing({ target: payments.stripePaymentIntentId })
    .returning({ id: payments.id })
  if (inserted.length === 0) return "unchanged"
  await note(
    tx,
    ctx,
    `Check this: ${formatMoney(amountCents, currency)} arrived through a payment link on booking ${ctx.ref}, but the payment it was for has been deleted. It is recorded as an extra payment on the booking; refund it in Stripe if it should not have been paid.`,
    today,
  )
  return "extra"
}

/** Records a completed Checkout Session for a payment link. Used by the webhook and by the /pay return page. */
export async function fulfilCheckoutSession(session: Stripe.Checkout.Session): Promise<FulfilResult> {
  const { paymentId, linkId, bookingId } = sessionIds(session)
  if (!paymentId || !linkId) return "ignored"
  if (session.status !== "complete") return "ignored"
  if (session.payment_status !== "paid" && session.payment_status !== "unpaid") return "ignored"

  const intentId = idOf(session.payment_intent)
  const customerId = idOf(session.customer)
  const now = new Date()

  const { result, familyId } = await getDb().transaction(async (tx) => {
    await failFastOnLocks(tx)
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update")
    if (!payment) return { result: await recordOrphan(tx, session, bookingId, intentId, now), familyId: null }
    const ctx = await paymentContext(tx, payment)
    const [found] = await tx.select().from(paymentLinks).where(eq(paymentLinks.id, linkId)).limit(1)
    const link = found && found.paymentId === payment.id ? found : null
    const done = (result: FulfilResult) => ({ result, familyId: ctx.familyId })

    if (session.payment_status === "unpaid") {
      // A bank payment was submitted and has not cleared. Only an open payment can wait on one.
      if (!link || !startsClearing(payment, link, session.id)) return done("unchanged")
      if (await intentUsedElsewhere(tx, payment.id, intentId)) return done("unchanged")
      // The link the family used, and whichever link is live now if the admin replaced it meanwhile.
      await tx
        .update(paymentLinks)
        .set({ processingSince: now })
        .where(
          and(
            eq(paymentLinks.paymentId, payment.id),
            isNull(paymentLinks.processingSince),
            or(eq(paymentLinks.id, link.id), isNull(paymentLinks.cancelledAt)),
          ),
        )
      await tx
        .update(payments)
        .set({ stripeCheckoutSessionId: session.id, stripePaymentIntentId: intentId })
        .where(eq(payments.id, payment.id))
      await note(
        tx,
        ctx,
        `Bank payment started: ${paymentLine(payment, payment.amountCents, payment.currency, ctx.ref)}. It can take a few business days to clear.`,
      )
      return done("processing")
    }

    const clearing = await anyLinkClearing(tx, payment.id)
    const plan = planPaid(payment, intentId, clearing)
    if (plan === "unchanged") return done("unchanged")

    // What Stripe took is the truth, even if the amount was edited after the link went out.
    const currency = (session.currency ?? payment.currency).toLowerCase()
    const amountCents = session.amount_total ?? payment.amountCents

    if (plan === "extra") {
      // A retry finds the row this session already produced (by intent, or by session when there is none).
      if (await alreadyRecorded(tx, session.id, intentId)) return done("unchanged")
      const today = pacificToday(now)
      const inserted = await tx
        .insert(payments)
        .values({
          bookingId: payment.bookingId,
          kind: "extra",
          label: EXTRA_LABEL,
          status: "paid",
          method: "stripe",
          amountCents,
          currency,
          dueOn: today,
          paidAt: now,
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId: intentId,
          notes: `Arrived through the payment link for ${paymentTitle(payment.kind, payment.label)} after that payment was already ${payment.status}.`,
        })
        .onConflictDoNothing({ target: payments.stripePaymentIntentId })
        .returning({ id: payments.id })
      if (inserted.length === 0) return done("unchanged")
      await note(
        tx,
        ctx,
        `Check this: ${formatMoney(amountCents, currency)} arrived through the payment link for ${paymentLine(payment, payment.amountCents, payment.currency, ctx.ref)}, which was already ${payment.status}. It is recorded as an extra payment on the booking; refund it in Stripe if it is a duplicate.`,
        today,
      )
      return done("extra")
    }

    if (plan === "pay" && (await intentUsedElsewhere(tx, payment.id, intentId))) return done("unchanged")

    const mismatch = amountCents !== payment.amountCents || currency !== payment.currency
    const adjustment = mismatch
      ? `Stripe took ${formatMoney(amountCents, currency)} through the payment link; the payment was recorded as ${formatMoney(payment.amountCents, payment.currency)}. Changed to match.`
      : null
    const reopened =
      plan === "reopen"
        ? `The bank payment cleared after this payment was marked ${payment.status}. Marked paid again; refund it in Stripe if that is wrong.`
        : null
    const notes = [payment.notes, adjustment, reopened].filter(Boolean).join("\n")
    await tx
      .update(payments)
      .set({
        status: "paid",
        paidAt: now,
        method: "stripe",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: intentId,
        ...(mismatch ? { amountCents, currency } : {}),
        ...(notes !== (payment.notes ?? "") ? { notes } : {}),
      })
      .where(eq(payments.id, payment.id))
    // Any link of this payment may be waiting on a bank payment; none is, now.
    await tx.update(paymentLinks).set({ processingSince: null }).where(eq(paymentLinks.paymentId, payment.id))
    const message = paidNote({
      line: paymentLine(payment, amountCents, currency, ctx.ref),
      reopenedFrom: plan === "reopen" ? payment.status : null,
      // The unpaid completion put this session on the payment; a replaced link keeps clearing too.
      wasClearing: clearing || payment.stripeCheckoutSessionId === session.id,
      bookingStatus: ctx.status,
      mismatch: mismatch
        ? { taken: { cents: amountCents, currency }, recorded: { cents: payment.amountCents, currency: payment.currency } }
        : null,
    })
    await note(tx, ctx, message.summary, message.followUp ? pacificToday(now) : null)
    return done("paid")
  })

  // Only a live-mode customer is kept: a test-mode one would be unknown to Stripe once live keys go in.
  if (session.livemode && customerId && familyId && result !== "missing") await attachCustomer(familyId, customerId)
  return result
}

/**
 * A bank payment through a link failed. Clears what the failed session left on the links and the
 * payment, so an open payment's link works again. When the owner had already marked the payment
 * paid, refunded, cancelled or waived, the same clearing happens and the note says so.
 */
export async function failAsyncPayment(
  session: Stripe.Checkout.Session,
): Promise<"updated" | "unchanged" | "missing" | "ignored"> {
  const { paymentId, linkId } = sessionIds(session)
  if (!paymentId || !linkId) return "ignored"

  const intentId = idOf(session.payment_intent)
  const now = new Date()

  return getDb().transaction(async (tx) => {
    await failFastOnLocks(tx)
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update")
    if (!payment) return "missing" as const
    const [link] = await tx.select().from(paymentLinks).where(eq(paymentLinks.id, linkId)).limit(1)
    if (!link || link.paymentId !== payment.id) return "missing" as const
    if (!failureApplies(payment, link, session.id, intentId)) return "unchanged" as const

    // Every link of the payment stops waiting; the failed session is forgotten so the next click opens a new one.
    await tx.update(paymentLinks).set({ processingSince: null, lastFailedAt: now }).where(eq(paymentLinks.paymentId, payment.id))
    if (link.checkoutSessionId === session.id) {
      await tx.update(paymentLinks).set({ checkoutSessionId: null }).where(eq(paymentLinks.id, link.id))
    }
    const clear: Partial<Pick<Payment, "stripePaymentIntentId" | "stripeCheckoutSessionId">> = {}
    if (intentId && payment.stripePaymentIntentId === intentId) clear.stripePaymentIntentId = null
    if (payment.stripeCheckoutSessionId === session.id) clear.stripeCheckoutSessionId = null
    if (Object.keys(clear).length > 0) await tx.update(payments).set(clear).where(eq(payments.id, payment.id))

    const ctx = await paymentContext(tx, payment)
    const message = failureNote(payment.status, paymentLine(payment, payment.amountCents, payment.currency, ctx.ref))
    await note(tx, ctx, message.summary, message.followUp ? pacificToday(now) : null)
    return "updated" as const
  })
}

/**
 * A refund in Stripe, found by payment intent: a full refund marks the payment refunded, a partial
 * one records the amount. "pending" = no payment holds the intent yet, but the payment named in
 * the charge's metadata is in this database (its completion is not recorded yet: worth a retry);
 * "missing" = the charge is not for anything here (another environment, or a deleted payment).
 */
export async function applyRefund(charge: Stripe.Charge): Promise<"updated" | "unchanged" | "pending" | "missing"> {
  const intentId = idOf(charge.payment_intent)
  if (!intentId) return "missing"

  return getDb().transaction(async (tx) => {
    await failFastOnLocks(tx)
    const [found] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, intentId))
      .limit(1)
    if (!found) {
      const named = charge.metadata?.payment_id
      if (!isUuid(named)) return "missing" as const
      const [exists] = await tx.select({ id: payments.id }).from(payments).where(eq(payments.id, named)).limit(1)
      return exists ? ("pending" as const) : ("missing" as const)
    }
    const [payment] = await tx.select().from(payments).where(eq(payments.id, found.id)).for("update")
    if (!payment) return "missing" as const

    const change = planRefund(payment, charge)
    if (!change) return "unchanged" as const
    await tx
      .update(payments)
      .set({ status: change.status, amountRefundedCents: change.amountRefundedCents, refundedAt: new Date() })
      .where(eq(payments.id, payment.id))

    const ctx = await paymentContext(tx, payment)
    const what = paymentLine(payment, payment.amountCents, payment.currency, ctx.ref)
    await note(
      tx,
      ctx,
      change.status === "refunded"
        ? `Refunded in Stripe: ${what}.`
        : `Partial refund in Stripe: ${formatMoney(change.amountRefundedCents, payment.currency)} of ${what} refunded so far.`,
    )
    return "updated" as const
  })
}

/** Stripe closed a session nobody paid: the link no longer points at it. */
export async function sessionExpired(session: Stripe.Checkout.Session): Promise<void> {
  const { linkId } = sessionIds(session)
  if (!linkId) return
  await getDb()
    .update(paymentLinks)
    .set({ checkoutSessionId: null })
    .where(and(eq(paymentLinks.id, linkId), eq(paymentLinks.checkoutSessionId, session.id)))
}
