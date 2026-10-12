import { and, eq, inArray, or } from "drizzle-orm"
import { getDb } from "../../db/client"
import { reservations, signups, stripeEvents, type Reservation } from "../../db/schema"
import type { JourneyId } from "./types"

export type CreateReservationInput = {
  signupId?: string | null
  email: string
  emailKey: string
  journey: JourneyId
  amountCents: number
  currency: string
}

export async function createReservation(input: CreateReservationInput): Promise<Reservation> {
  const [row] = await getDb()
    .insert(reservations)
    .values({ ...input, status: "pending" })
    .returning()
  return row
}

export async function attachCheckoutSession(id: string, sessionId: string): Promise<void> {
  await getDb()
    .update(reservations)
    .set({ stripeCheckoutSessionId: sessionId, updatedAt: new Date() })
    .where(eq(reservations.id, id))
}

export async function findBySession(sessionId: string): Promise<Reservation | undefined> {
  const [row] = await getDb()
    .select()
    .from(reservations)
    .where(eq(reservations.stripeCheckoutSessionId, sessionId))
    .limit(1)
  return row
}

/** Links a deposit to the early-access signup that holds this capability token. */
export async function findSignupIdByToken(token: string): Promise<string | undefined> {
  const [row] = await getDb()
    .select({ id: signups.id })
    .from(signups)
    .where(eq(signups.confirmToken, token))
    .limit(1)
  return row?.id
}

export type TransitionResult = "updated" | "unchanged" | "missing"

async function sessionExists(sessionId: string): Promise<boolean> {
  return (await findBySession(sessionId)) !== undefined
}

/**
 * Only a pending reservation can become paid: a late or retried completion event must not
 * resurrect a deposit that was already refunded or expired. "missing" means no row matched at
 * all, which the caller treats as a failure so Stripe retries.
 */
export async function markPaid(args: {
  sessionId: string
  paymentIntentId: string | null
  customerId: string | null
  holdExpiresAt: Date
}): Promise<TransitionResult> {
  const now = new Date()
  const rows = await getDb()
    .update(reservations)
    .set({
      status: "paid",
      stripePaymentIntentId: args.paymentIntentId,
      stripeCustomerId: args.customerId,
      holdExpiresAt: args.holdExpiresAt,
      paidAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(reservations.stripeCheckoutSessionId, args.sessionId),
        eq(reservations.status, "pending"),
      ),
    )
    .returning({ id: reservations.id })
  if (rows.length > 0) return "updated"
  return (await sessionExists(args.sessionId)) ? "unchanged" : "missing"
}

/**
 * Matches by payment intent, or by the reservation id we put in the charge metadata when the
 * refund event outruns the completion event (the intent id is stored only on payment).
 */
export async function markRefunded(args: {
  paymentIntentId: string
  reservationId?: string | null
}): Promise<TransitionResult> {
  const now = new Date()
  const match = args.reservationId
    ? or(
        eq(reservations.stripePaymentIntentId, args.paymentIntentId),
        eq(reservations.id, args.reservationId),
      )
    : eq(reservations.stripePaymentIntentId, args.paymentIntentId)
  const rows = await getDb()
    .update(reservations)
    .set({ status: "refunded", refundedAt: now, updatedAt: now })
    .where(and(match, inArray(reservations.status, ["pending", "paid"])))
    .returning({ id: reservations.id })
  if (rows.length > 0) return "updated"
  const [existing] = await getDb()
    .select({ id: reservations.id })
    .from(reservations)
    .where(match)
    .limit(1)
  return existing ? "unchanged" : "missing"
}

export async function markExpired(sessionId: string): Promise<void> {
  const [row] = await getDb()
    .select({ id: reservations.id, status: reservations.status })
    .from(reservations)
    .where(eq(reservations.stripeCheckoutSessionId, sessionId))
    .limit(1)
  // An expiry event must never downgrade a deposit that has already been paid.
  if (!row || row.status !== "pending") return
  await getDb()
    .update(reservations)
    .set({ status: "expired", updatedAt: new Date() })
    .where(eq(reservations.id, row.id))
}

export async function hasProcessedEvent(id: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.id, id))
    .limit(1)
  return rows.length > 0
}

/** Returns true when this call recorded the event, false when it was already seen. */
export async function recordEvent(id: string, type: string): Promise<boolean> {
  const rows = await getDb()
    .insert(stripeEvents)
    .values({ id, type })
    .onConflictDoNothing({ target: stripeEvents.id })
    .returning({ id: stripeEvents.id })
  return rows.length > 0
}

/** Lets Stripe's retry reprocess an event whose handler failed after it was recorded. */
export async function forgetEvent(id: string): Promise<void> {
  await getDb().delete(stripeEvents).where(eq(stripeEvents.id, id))
}
