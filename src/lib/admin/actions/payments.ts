"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getDb } from "@/db/client"
import { bookings, paymentKind, paymentMethod, paymentStatus, payments } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { cents, currency, date, dbMessage, failed, isUuid, oneOf, pacificDateTime, saved, text, type FormState } from "@/lib/admin/forms"

const PAYMENT_CONSTRAINTS = {
  payments_amounts_check: "The amount must be more than zero, and the refunded amount can't be negative or more than the amount.",
  payments_paid_at_check: "A paid or refunded payment needs the date and time it was paid.",
  payments_refunded_check: "A payment marked refunded must have its whole amount refunded.",
  payments_currency_check: "Currency must be a three-letter code such as usd or eur.",
  payments_reservation_kind_check: "A payment linked to a Stripe deposit has to stay a deposit.",
  payments_booking_id_bookings_id_fk: "That booking no longer exists.",
}

const OTHER_CURRENCY_NOTE = " It is in a different currency from the booking, so it is listed but not added into the booking's totals."

// integer columns hold up to 2,147,483,647 cents.
const MAX_CENTS = 2_000_000_000

function amount(fd: FormData, name: string, label: string): { ok: true; value: number | null } | { ok: false; state: FormState } {
  const v = cents(fd, name)
  if (v === undefined) return { ok: false, state: failed(`${label} must be an amount such as 2,500.00.`, name) }
  if (v !== null && (v < 0 || v > MAX_CENTS)) {
    return { ok: false, state: failed(`${label} must be zero or more, and under 20 million.`, name) }
  }
  return { ok: true, value: v }
}

/**
 * Reads and cross-checks a payment form against its booking. The rules that the database also
 * enforces are repeated here so the owner gets a sentence that names the field.
 */
async function readPayment(fd: FormData, bookingId: string) {
  const [booking] = await getDb()
    .select({ currency: bookings.currency, departureId: bookings.departureId })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1)
  if (!booking) return { ok: false as const, state: failed("That booking no longer exists.") }

  const kind = oneOf(fd, "kind", paymentKind.enumValues)
  if (!kind) return { ok: false as const, state: failed("Choose what kind of payment this is.", "kind") }

  const amountCents = amount(fd, "amount", "Amount")
  if (!amountCents.ok) return amountCents
  if (amountCents.value === null || amountCents.value <= 0) {
    return { ok: false as const, state: failed("Enter an amount above zero.", "amount") }
  }

  const currencyInput = currency(fd, "currency")
  if (currencyInput === undefined) return { ok: false as const, state: failed("Currency must be a three-letter code such as usd or eur.", "currency") }
  // Any currency is allowed: the booking page lists other-currency payments but leaves them out of its sums.
  const currencyValue = currencyInput ?? booking.currency

  const dueOn = date(fd, "due_on")
  if (!dueOn) return { ok: false as const, state: failed("Enter the date this payment is due.", "due_on") }

  const status = oneOf(fd, "status", paymentStatus.enumValues) ?? "scheduled"
  const method = oneOf(fd, "method", paymentMethod.enumValues) ?? "stripe"

  const paidAt = pacificDateTime(fd, "paid_at")
  if (paidAt === undefined) return { ok: false as const, state: failed("Paid at isn't a valid date and time.", "paid_at") }
  if ((status === "paid" || status === "refunded") && !paidAt) {
    return { ok: false as const, state: failed("Enter when it was paid: a paid or refunded payment needs that.", "paid_at") }
  }

  const refunded = amount(fd, "amount_refunded", "Refunded amount")
  if (!refunded.ok) return refunded
  const refundedCents = refunded.value ?? 0
  if (refundedCents > amountCents.value) {
    return { ok: false as const, state: failed("The refunded amount can't be more than the payment.", "amount_refunded") }
  }
  if (status === "refunded" && refundedCents !== amountCents.value) {
    return { ok: false as const, state: failed("A payment marked refunded must have its whole amount refunded. For a partial refund, keep it paid.", "amount_refunded") }
  }
  if (refundedCents > 0 && status !== "paid" && status !== "refunded") {
    return { ok: false as const, state: failed("Only a paid payment can have a refund.", "amount_refunded") }
  }

  return {
    ok: true as const,
    departureId: booking.departureId,
    otherCurrency: currencyValue !== booking.currency,
    values: {
      kind,
      label: text(fd, "label", 200),
      status,
      method,
      amountCents: amountCents.value,
      currency: currencyValue,
      dueOn,
      paidAt,
      amountRefundedCents: refundedCents,
      notes: text(fd, "notes", 2000),
    },
  }
}

function refresh(bookingId: string, departureId: string) {
  revalidatePath(`/admin/bookings/${bookingId}`)
  revalidatePath(`/admin/trips/${departureId}`)
}

export async function addPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const bookingId = text(formData, "booking_id", 60)
  if (!isUuid(bookingId)) return failed("That booking could not be found.")

  let message = "Payment added."
  try {
    const parsed = await readPayment(formData, bookingId)
    if (!parsed.ok) return parsed.state
    await getDb()
      .insert(payments)
      .values({
        ...parsed.values,
        bookingId,
        refundedAt: parsed.values.amountRefundedCents > 0 ? new Date() : null,
      })
    refresh(bookingId, parsed.departureId)
    if (parsed.otherCurrency) message += OTHER_CURRENCY_NOTE
  } catch (err) {
    return failed(dbMessage(err, PAYMENT_CONSTRAINTS))
  }
  return saved(message)
}

export async function updatePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  const bookingId = text(formData, "booking_id", 60)
  if (!isUuid(id) || !isUuid(bookingId)) return failed("That payment could not be found.")

  let message = "Payment saved."
  try {
    const db = getDb()
    const [existing] = await db
      .select({ bookingId: payments.bookingId, refundedAt: payments.refundedAt })
      .from(payments)
      .where(eq(payments.id, id))
      .limit(1)
    if (!existing || existing.bookingId !== bookingId) return failed("That payment no longer exists.")

    const parsed = await readPayment(formData, bookingId)
    if (!parsed.ok) return parsed.state
    // Stripe ids and the linked deposit reservation are not on the form, so they are left alone.
    await db
      .update(payments)
      .set({
        ...parsed.values,
        refundedAt: parsed.values.amountRefundedCents > 0 ? (existing.refundedAt ?? new Date()) : null,
      })
      .where(eq(payments.id, id))
    refresh(bookingId, parsed.departureId)
    if (parsed.otherCurrency) message += OTHER_CURRENCY_NOTE
  } catch (err) {
    return failed(dbMessage(err, PAYMENT_CONSTRAINTS))
  }
  return saved(message)
}

export async function deletePayment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  const bookingId = text(formData, "booking_id", 60)
  if (!isUuid(id) || !isUuid(bookingId)) return failed("That payment could not be found.")

  try {
    const db = getDb()
    const [row] = await db
      .select({ status: payments.status, bookingId: payments.bookingId, departureId: bookings.departureId })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .where(eq(payments.id, id))
      .limit(1)
    if (!row || row.bookingId !== bookingId) return failed("That payment no longer exists.")
    if (row.status === "paid" || row.status === "refunded") {
      return failed("Paid payments can't be deleted. Mark them refunded or cancelled instead.")
    }
    await db.delete(payments).where(eq(payments.id, id))
    refresh(bookingId, row.departureId)
  } catch (err) {
    return failed(dbMessage(err))
  }
  return saved("Payment deleted.")
}
