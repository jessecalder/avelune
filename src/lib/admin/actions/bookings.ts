"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getDb } from "@/db/client"
import { ageBand, bookingStatus, bookingTravellers, bookings, departures } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { cents, currency, dbMessage, failed, isUuid, oneOf, pacificDateTime, saved, text, type FormState } from "@/lib/admin/forms"

const BOOKING_CONSTRAINTS = {
  bookings_active_family_departure_idx: "That family already has an active booking on this departure. Cancel that one first, or open it instead.",
  bookings_family_id_families_id_fk: "That family no longer exists.",
  bookings_departure_id_departures_id_fk: "That departure no longer exists.",
  bookings_price_check: "The total price can't be negative.",
  bookings_currency_check: "Currency must be a three-letter code such as usd or eur.",
}

// integer column holds up to 2,147,483,647 cents.
const MAX_CENTS = 2_000_000_000

/** Total price: blank is allowed (price not agreed yet); otherwise zero or more. */
function readTotal(fd: FormData): { ok: true; value: number | null } | { ok: false; state: FormState } {
  const v = cents(fd, "total_price")
  if (v === undefined) return { ok: false, state: failed("Total price must be an amount such as 12,500.00.", "total_price") }
  if (v !== null && (v < 0 || v > MAX_CENTS)) {
    return { ok: false, state: failed("Total price must be zero or more, and under 20 million.", "total_price") }
  }
  return { ok: true, value: v }
}

/** A new booking cannot start out cancelled: that needs a reason, which the edit form asks for. */
const NEW_BOOKING_STATUSES = ["waitlisted", "held", "confirmed"] as const

export async function createBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const departureId = text(formData, "departure_id", 60)
  if (!isUuid(departureId)) return failed("That departure could not be found.")
  const familyId = text(formData, "family_id", 60)
  if (!isUuid(familyId)) return failed("Choose a family.", "family_id")

  const status = oneOf(formData, "status", NEW_BOOKING_STATUSES) ?? "held"
  const total = readTotal(formData)
  if (!total.ok) return total.state
  const currencyInput = currency(formData, "currency")
  if (currencyInput === undefined) return failed("Currency must be a three-letter code such as usd or eur.", "currency")

  let id: string
  try {
    const db = getDb()
    const [dep] = await db.select({ currency: departures.currency }).from(departures).where(eq(departures.id, departureId)).limit(1)
    if (!dep) return failed("That departure no longer exists.")
    const [row] = await db
      .insert(bookings)
      .values({
        familyId,
        departureId,
        status,
        totalPriceCents: total.value,
        currency: currencyInput ?? dep.currency,
        confirmedAt: status === "confirmed" ? new Date() : null,
      })
      .returning({ id: bookings.id })
    if (!row) return failed("The booking was not saved. Try again.")
    id = row.id
  } catch (err) {
    return failed(dbMessage(err, BOOKING_CONSTRAINTS))
  }
  revalidatePath(`/admin/trips/${departureId}`)
  revalidatePath(`/admin/families/${familyId}`)
  redirect(`/admin/bookings/${id}`)
}

export async function updateBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That booking could not be found.")

  const status = oneOf(formData, "status", bookingStatus.enumValues)
  if (!status) return failed("Choose a status.", "status")
  const total = readTotal(formData)
  if (!total.ok) return total.state
  const currencyValue = currency(formData, "currency")
  if (!currencyValue) return failed("Currency must be a three-letter code such as usd or eur.", "currency")

  const heldUntil = pacificDateTime(formData, "held_until")
  if (heldUntil === undefined) return failed("Held until isn't a valid date and time.", "held_until")
  const termsAcceptedAt = pacificDateTime(formData, "terms_accepted_at")
  if (termsAcceptedAt === undefined) return failed("Terms accepted isn't a valid date and time.", "terms_accepted_at")
  const privacyAcceptedAt = pacificDateTime(formData, "privacy_accepted_at")
  if (privacyAcceptedAt === undefined) return failed("Privacy accepted isn't a valid date and time.", "privacy_accepted_at")
  const arrivesAt = pacificDateTime(formData, "arrives_at")
  if (arrivesAt === undefined) return failed("Arrival isn't a valid date and time.", "arrives_at")
  const departsAt = pacificDateTime(formData, "departs_at")
  if (departsAt === undefined) return failed("Departure isn't a valid date and time.", "departs_at")

  const cancellationReason = text(formData, "cancellation_reason", 2000)
  if (status === "cancelled" && !cancellationReason) return failed("Give a cancellation reason before cancelling a booking.", "cancellation_reason")

  try {
    const db = getDb()
    const [existing] = await db
      .select({ confirmedAt: bookings.confirmedAt, cancelledAt: bookings.cancelledAt, departureId: bookings.departureId, familyId: bookings.familyId })
      .from(bookings)
      .where(eq(bookings.id, id))
      .limit(1)
    if (!existing) return failed("That booking no longer exists.")

    const now = new Date()
    // ref is filled by the database and is never written.
    await db
      .update(bookings)
      .set({
        status,
        totalPriceCents: total.value,
        currency: currencyValue,
        heldUntil,
        termsVersion: text(formData, "terms_version", 100),
        termsAcceptedAt,
        privacyVersion: text(formData, "privacy_version", 100),
        privacyAcceptedAt,
        confirmedAt: status === "confirmed" && !existing.confirmedAt ? now : existing.confirmedAt,
        cancelledAt: status === "cancelled" ? (existing.cancelledAt ?? now) : null,
        cancellationReason,
        arrivesAt,
        arrivalDetails: text(formData, "arrival_details", 1000),
        departsAt,
        departureDetails: text(formData, "departure_details", 1000),
        notes: text(formData, "notes", 4000),
      })
      .where(eq(bookings.id, id))
    revalidatePath(`/admin/trips/${existing.departureId}`)
    revalidatePath(`/admin/families/${existing.familyId}`)
  } catch (err) {
    return failed(dbMessage(err, BOOKING_CONSTRAINTS))
  }
  revalidatePath(`/admin/bookings/${id}`)
  return saved("Booking saved.")
}

const TRAVELLER_CONSTRAINTS = {
  booking_travellers_booking_traveller_idx: "Already on this booking.",
  booking_travellers_booking_id_bookings_id_fk: "That booking no longer exists.",
  booking_travellers_traveller_id_travellers_id_fk: "That traveller no longer exists.",
}

/** Adds the ticked family members, each on the age band chosen for this trip. */
export async function addBookingTravellers(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const bookingId = text(formData, "booking_id", 60)
  if (!isUuid(bookingId)) return failed("That booking could not be found.")

  const ids = [...new Set(formData.getAll("traveller_id").filter((v): v is string => typeof v === "string"))]
  if (ids.length === 0) return failed("Tick at least one traveller.")
  if (ids.length > 50 || !ids.every(isUuid)) return failed("One of the travellers could not be found.")

  const rows: { bookingId: string; travellerId: string; ageBand: (typeof ageBand.enumValues)[number] }[] = []
  for (const travellerId of ids) {
    const band = oneOf(formData, `age_band_${travellerId}`, ageBand.enumValues)
    if (!band) return failed("Choose an age band for each ticked traveller.")
    rows.push({ bookingId, travellerId, ageBand: band })
  }

  try {
    // One statement, so either everyone is added or no one is. A database trigger refuses
    // travellers from another family (check_violation; dbMessage words it).
    await getDb().insert(bookingTravellers).values(rows)
  } catch (err) {
    return failed(dbMessage(err, TRAVELLER_CONSTRAINTS))
  }
  revalidatePath(`/admin/bookings/${bookingId}`)
  return saved(rows.length === 1 ? "Traveller added." : "Travellers added.")
}

export async function removeBookingTraveller(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  const bookingId = text(formData, "booking_id", 60)
  if (!isUuid(id) || !isUuid(bookingId)) return failed("That traveller could not be found.")

  try {
    await getDb().delete(bookingTravellers).where(and(eq(bookingTravellers.id, id), eq(bookingTravellers.bookingId, bookingId)))
  } catch (err) {
    return failed(dbMessage(err))
  }
  revalidatePath(`/admin/bookings/${bookingId}`)
  return saved("Traveller removed.")
}
