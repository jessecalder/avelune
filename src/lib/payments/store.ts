import { and, desc, eq, isNull, sql, type SQL } from "drizzle-orm"
import { getDb } from "../../db/client"
import {
  bookings,
  departures,
  families,
  paymentLinks,
  payments,
  type Booking,
  type Departure,
  type Payment,
  type PaymentLink,
} from "../../db/schema"
import { expireOpenSession } from "./checkout"
import { isPayable } from "./state"
import { isLinkToken, newLinkToken } from "./token"

/** Why a link could not be created: no such payment, or the payment can no longer be collected. */
export class PaymentLinkError extends Error {
  constructor(public code: "missing" | "not-payable") {
    super(`payment link: ${code}`)
    this.name = "PaymentLinkError"
  }
}

/** Everything the customer page and the checkout need about one link, with only the fields a family may see. */
export type PayView = {
  link: PaymentLink
  payment: Payment
  booking: { id: string; ref: string; status: Booking["status"] }
  family: {
    id: string
    familyName: string
    primaryContactName: string | null
    email: string
    stripeCustomerId: string | null
  }
  departure: { id: string; name: string; journey: Departure["journey"]; startsOn: string; endsOn: string }
}

async function loadView(where: SQL): Promise<PayView | null> {
  const [row] = await getDb()
    .select({
      link: paymentLinks,
      payment: payments,
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
    .from(paymentLinks)
    .innerJoin(payments, eq(payments.id, paymentLinks.paymentId))
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .innerJoin(families, eq(families.id, bookings.familyId))
    .innerJoin(departures, eq(departures.id, bookings.departureId))
    .where(where)
    .limit(1)
  return row ?? null
}

/** The page behind /pay/<token>. Null for a malformed or unknown token. */
export async function getPayViewByToken(token: string): Promise<PayView | null> {
  if (!isLinkToken(token)) return null
  return loadView(eq(paymentLinks.token, token))
}

export async function getPayViewByLinkId(linkId: string): Promise<PayView | null> {
  return loadView(eq(paymentLinks.id, linkId))
}

/** The payment's live link (cancelled_at IS NULL), if it has one. */
export async function getActiveLink(paymentId: string): Promise<PaymentLink | null> {
  const [row] = await getDb()
    .select()
    .from(paymentLinks)
    .where(and(eq(paymentLinks.paymentId, paymentId), isNull(paymentLinks.cancelledAt)))
    .limit(1)
  return row ?? null
}

/** Every link the payment has had, newest first. */
export async function listLinks(paymentId: string): Promise<PaymentLink[]> {
  return getDb()
    .select()
    .from(paymentLinks)
    .where(eq(paymentLinks.paymentId, paymentId))
    .orderBy(desc(paymentLinks.createdAt))
}

/**
 * Cancels any live link for the payment, inserts a new one, and moves a scheduled payment to
 * invoiced (method stripe). Throws PaymentLinkError("missing" | "not-payable"): not payable means
 * the payment is not scheduled/invoiced or the booking is cancelled. Best-effort expires the
 * replaced link's open Checkout Session after the transaction.
 */
export async function createLink(paymentId: string, opts: { expiresAt: Date | null }): Promise<PaymentLink> {
  const now = new Date()
  const { link, replacedSessions } = await getDb().transaction(async (tx) => {
    // Lock order everywhere: the payment row, then its link rows.
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update")
    if (!payment) throw new PaymentLinkError("missing")
    const [booking] = await tx
      .select({ status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId))
      .limit(1)
    if (!booking || booking.status === "cancelled" || !isPayable(payment.status)) {
      throw new PaymentLinkError("not-payable")
    }

    const replaced = await tx
      .update(paymentLinks)
      .set({ cancelledAt: now })
      .where(and(eq(paymentLinks.paymentId, paymentId), isNull(paymentLinks.cancelledAt)))
      .returning({ sessionId: paymentLinks.checkoutSessionId, processingSince: paymentLinks.processingSince })

    // A bank payment still clearing on the replaced link keeps the family from paying twice.
    const processingSince = replaced.find((r) => r.processingSince)?.processingSince ?? null
    const [created] = await tx
      .insert(paymentLinks)
      .values({ paymentId, token: newLinkToken(), expiresAt: opts.expiresAt, processingSince })
      .returning()

    if (payment.status === "scheduled") {
      await tx.update(payments).set({ status: "invoiced", method: "stripe" }).where(eq(payments.id, paymentId))
    }
    return {
      link: created,
      // A session that is clearing a bank payment is already complete; there is nothing to expire.
      replacedSessions: replaced.flatMap((r) => (r.sessionId && !r.processingSince ? [r.sessionId] : [])),
    }
  })
  for (const sessionId of replacedSessions) await expireOpenSession(sessionId)
  return link
}

/** Sets cancelled_at (no-op if already cancelled) and best-effort expires its open Checkout Session. */
export async function cancelLink(linkId: string): Promise<void> {
  const now = new Date()
  const sessionId = await getDb().transaction(async (tx) => {
    const [link] = await tx
      .select({ paymentId: paymentLinks.paymentId })
      .from(paymentLinks)
      .where(eq(paymentLinks.id, linkId))
      .limit(1)
    if (!link) return null
    await tx.select({ id: payments.id }).from(payments).where(eq(payments.id, link.paymentId)).for("update")
    const [cancelled] = await tx
      .update(paymentLinks)
      .set({ cancelledAt: now })
      .where(and(eq(paymentLinks.id, linkId), isNull(paymentLinks.cancelledAt)))
      .returning({ sessionId: paymentLinks.checkoutSessionId, processingSince: paymentLinks.processingSince })
    return cancelled && !cancelled.processingSince ? cancelled.sessionId : null
  })
  if (sessionId) await expireOpenSession(sessionId)
}

/**
 * One more view by the family: open_count + 1, first_opened_at keeps its first value. Never waits
 * for the row: while a checkout holds the link locked (it may be waiting on Stripe) the open is
 * dropped rather than parking a pooled connection behind it.
 */
export async function recordOpen(linkId: string): Promise<void> {
  await getDb()
    .update(paymentLinks)
    .set({
      openCount: sql`${paymentLinks.openCount} + 1`,
      firstOpenedAt: sql`coalesce(${paymentLinks.firstOpenedAt}, now())`,
      lastOpenedAt: sql`now()`,
    })
    .where(sql`${paymentLinks.id} = (select pl.id from payment_links pl where pl.id = ${linkId} for update skip locked)`)
}

/** The link went to `to`, by the app or by hand: email_sent_at = now, send count + 1. */
export async function recordEmailSent(linkId: string, to: string): Promise<void> {
  await getDb()
    .update(paymentLinks)
    .set({
      emailSentAt: new Date(),
      emailSentTo: to,
      // smallint: stop at its ceiling instead of failing the update.
      emailSendCount: sql`least(${paymentLinks.emailSendCount} + 1, 32767)`,
    })
    .where(eq(paymentLinks.id, linkId))
}
