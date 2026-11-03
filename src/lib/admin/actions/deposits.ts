"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getDb } from "@/db/client"
import { bookings, families, payments, reservations } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { dbMessage, failed, isUuid, saved, text, type FormState } from "@/lib/admin/forms"

const PAYMENT_CONSTRAINTS = {
  payments_reservation_id_idx: "This deposit is already recorded on a booking.",
  payments_stripe_payment_intent_idx: "A payment with this Stripe payment intent is already recorded.",
  payments_stripe_invoice_idx: "A payment with this Stripe invoice is already recorded.",
  payments_booking_id_bookings_id_fk: "That booking no longer exists.",
  payments_reservation_id_reservations_id_fk: "That reservation no longer exists.",
  payments_amounts_check: "The deposit amount must be more than zero.",
  payments_paid_at_check: "This reservation has no paid date, so it can't be recorded as paid.",
  payments_refunded_check: "A refunded payment must be refunded in full.",
  payments_currency_check: "The reservation's currency isn't a three-letter code, so it can't be recorded.",
}

/** Copies a paid or refunded Stripe Checkout deposit onto one of the matched family's bookings. */
export async function recordDepositOnBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const reservationId = text(formData, "reservation_id", 60)
  const bookingId = text(formData, "booking_id", 60)
  if (!isUuid(reservationId)) return failed("That reservation could not be found.")
  if (!isUuid(bookingId)) return failed("Choose the booking this deposit belongs to.", "booking_id")

  const db = getDb()
  try {
    const [reservation] = await db.select().from(reservations).where(eq(reservations.id, reservationId)).limit(1)
    if (!reservation) return failed("That reservation no longer exists.")
    if (reservation.status !== "paid" && reservation.status !== "refunded") {
      return failed("Only paid or refunded deposits can be recorded on a booking.")
    }
    if (!reservation.paidAt) return failed("This reservation has no paid date, so it can't be recorded.")

    const [family] = await db.select({ id: families.id }).from(families).where(eq(families.emailKey, reservation.emailKey)).limit(1)
    if (!family) return failed("No family has this email yet. Create the family first.")

    const [booking] = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.familyId, family.id)))
      .limit(1)
    if (!booking) return failed("That booking doesn't belong to the family with this email.", "booking_id")

    const [already] = await db.select({ id: payments.id }).from(payments).where(eq(payments.reservationId, reservation.id)).limit(1)
    if (already) return failed("This deposit is already recorded on a booking.")

    const refunded = reservation.status === "refunded"
    await db.insert(payments).values({
      bookingId: booking.id,
      kind: "deposit",
      label: "Founding-family deposit",
      status: refunded ? "refunded" : "paid",
      method: "stripe",
      amountCents: reservation.amountCents,
      currency: reservation.currency,
      dueOn: reservation.paidAt.toISOString().slice(0, 10),
      paidAt: reservation.paidAt,
      amountRefundedCents: refunded ? reservation.amountCents : 0,
      refundedAt: refunded ? reservation.refundedAt : null,
      reservationId: reservation.id,
      stripeCheckoutSessionId: reservation.stripeCheckoutSessionId,
      stripePaymentIntentId: reservation.stripePaymentIntentId,
    })
  } catch (err) {
    return failed(dbMessage(err, PAYMENT_CONSTRAINTS))
  }
  revalidatePath("/admin/deposits")
  revalidatePath(`/admin/bookings/${bookingId}`)
  return saved("Recorded on the booking.")
}

/**
 * The Stripe webhook marks only the reservation refunded; the payment copied onto a booking
 * keeps saying paid. This brings the booking's payment in line with the reservation.
 */
export async function syncRefundToBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const reservationId = text(formData, "reservation_id", 60)
  if (!isUuid(reservationId)) return failed("That reservation could not be found.")

  let bookingId: string
  try {
    const db = getDb()
    const [reservation] = await db
      .select({ status: reservations.status, refundedAt: reservations.refundedAt })
      .from(reservations)
      .where(eq(reservations.id, reservationId))
      .limit(1)
    if (!reservation) return failed("That reservation no longer exists.")
    if (reservation.status !== "refunded") return failed("This deposit has not been refunded in Stripe.")

    const [payment] = await db
      .select({ id: payments.id, bookingId: payments.bookingId, status: payments.status, amountCents: payments.amountCents, paidAt: payments.paidAt })
      .from(payments)
      .where(eq(payments.reservationId, reservationId))
      .limit(1)
    if (!payment) return failed("This deposit is not recorded on a booking.")
    if (payment.status === "refunded") return failed("The booking already shows this deposit as refunded.")
    if (!payment.paidAt) return failed("The booking's payment has no paid date, so it can't be marked refunded.")

    await db
      .update(payments)
      .set({ status: "refunded", amountRefundedCents: payment.amountCents, refundedAt: reservation.refundedAt ?? new Date() })
      .where(eq(payments.id, payment.id))
    bookingId = payment.bookingId
  } catch (err) {
    return failed(dbMessage(err, PAYMENT_CONSTRAINTS))
  }
  revalidatePath("/admin/deposits")
  revalidatePath(`/admin/bookings/${bookingId}`)
  return saved("Booking updated: the deposit is now marked refunded.")
}
