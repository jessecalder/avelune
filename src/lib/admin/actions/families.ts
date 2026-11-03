"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getDb } from "@/db/client"
import { ageBand, bookings, departures, familyStatus, families, travellers, type NewFamily } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { cents, currency, dbMessage, failed, isUuid, oneOf, saved, text, type FormState } from "@/lib/admin/forms"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CHILD_NAMES = "Children's names wait for the booking-stage privacy notice; use a label such as 'Child 1'."
const CHILD_CONTACT = "Children can't have contact details."

const FAMILY_CONSTRAINTS = {
  families_email_key_idx: "A family with that email already exists.",
  families_country_code_check: "Country must be a two-letter code such as US.",
}

const TRAVELLER_CONSTRAINTS = {
  travellers_child_contact_check: CHILD_CONTACT,
  travellers_sensitive_gate_check: CHILD_NAMES,
  travellers_family_id_families_id_fk: "That family no longer exists.",
}

const BOOKING_CONSTRAINTS = {
  bookings_active_family_departure_idx: "This family already has an active booking on that departure.",
  bookings_price_check: "The price can't be negative.",
  bookings_currency_check: "Currency must be a three-letter code such as usd or eur.",
  bookings_family_id_families_id_fk: "That family no longer exists.",
  bookings_departure_id_departures_id_fk: "That departure no longer exists.",
}

type Parsed<T> = { ok: true; values: T } | { ok: false; state: FormState }

function readFamily(fd: FormData): Parsed<Omit<NewFamily, "id" | "emailKey">> {
  const familyName = text(fd, "family_name", 200)
  if (!familyName) return { ok: false, state: failed("Give the family a name, such as 'The Ortiz family'.", "family_name") }

  const email = text(fd, "email", 320)
  if (!email) return { ok: false, state: failed("Enter the primary contact's email.", "email") }
  if (!EMAIL_RE.test(email)) return { ok: false, state: failed("That email address doesn't look right.", "email") }

  // Blank defaults to US; the database check wants two capitals.
  const country = (text(fd, "country_code", 10) ?? "US").toUpperCase()
  if (!/^[A-Z]{2}$/.test(country)) {
    return { ok: false, state: failed("Country must be a two-letter code such as US.", "country_code") }
  }

  return {
    ok: true,
    values: {
      familyName,
      primaryContactName: text(fd, "primary_contact_name", 200),
      email,
      phone: text(fd, "phone", 60),
      homeCity: text(fd, "home_city", 200),
      countryCode: country,
      status: oneOf(fd, "status", familyStatus.enumValues) ?? "lead",
      source: text(fd, "source", 300),
      notes: text(fd, "notes", 4000),
    },
  }
}

export async function createFamily(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const parsed = readFamily(formData)
  if (!parsed.ok) return parsed.state

  let id: string
  try {
    const [row] = await getDb().insert(families).values(parsed.values).returning({ id: families.id })
    if (!row) return failed("The family was not saved. Try again.")
    id = row.id
  } catch (err) {
    return failed(dbMessage(err, FAMILY_CONSTRAINTS))
  }
  revalidatePath("/admin/families")
  redirect(`/admin/families/${id}`)
}

export async function updateFamily(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That family could not be found.")
  const parsed = readFamily(formData)
  if (!parsed.ok) return parsed.state

  try {
    const rows = await getDb().update(families).set(parsed.values).where(eq(families.id, id)).returning({ id: families.id })
    if (rows.length === 0) return failed("That family no longer exists.")
  } catch (err) {
    return failed(dbMessage(err, FAMILY_CONSTRAINTS))
  }
  revalidatePath(`/admin/families/${id}`)
  revalidatePath("/admin/families")
  return saved("Family saved.")
}

export async function deleteFamily(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That family could not be found.")

  try {
    await getDb().delete(families).where(eq(families.id, id))
  } catch (err) {
    return failed(
      dbMessage(err, {
        bookings_family_id_families_id_fk: "This family has bookings. Cancel them instead of deleting the family.",
        booking_travellers_traveller_id_travellers_id_fk: "This family has bookings. Cancel them instead of deleting the family.",
      }),
    )
  }
  revalidatePath("/admin/families")
  redirect("/admin/families")
}

/* ---------------------------------- travellers ---------------------------------- */

type PersonValues = { firstName: string | null; lastName: string | null; email: string | null; phone: string | null }

/**
 * Names and contact details for a person. Children get neither: their names are sensitive until
 * the booking-stage privacy notice is live, and the database refuses their email and phone.
 */
function readPerson(fd: FormData, band: (typeof ageBand.enumValues)[number]): Parsed<PersonValues> {
  const firstName = text(fd, "first_name", 200)
  const lastName = text(fd, "last_name", 200)
  const email = text(fd, "email", 320)
  const phone = text(fd, "phone", 60)

  if (band !== "adult") {
    if (firstName !== null || lastName !== null) return { ok: false, state: failed(CHILD_NAMES, "first_name") }
    if (email !== null || phone !== null) return { ok: false, state: failed(CHILD_CONTACT, "email") }
  } else if (email !== null && !EMAIL_RE.test(email)) {
    return { ok: false, state: failed("That email address doesn't look right.", "email") }
  }
  return { ok: true, values: { firstName, lastName, email, phone } }
}

export async function addTraveller(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const familyId = text(formData, "family_id", 60)
  if (!isUuid(familyId)) return failed("That family could not be found.")

  const label = text(formData, "label", 200)
  if (!label) return failed("Give the person a label such as 'Parent 1' or 'Child 1'.", "label")
  const band = oneOf(formData, "age_band", ageBand.enumValues)
  if (!band) return failed("Choose an age band.", "age_band")
  const person = readPerson(formData, band)
  if (!person.ok) return person.state

  try {
    await getDb()
      .insert(travellers)
      .values({ familyId, label, ageBand: band, relationship: text(formData, "relationship", 200), ...person.values })
  } catch (err) {
    return failed(dbMessage(err, TRAVELLER_CONSTRAINTS))
  }
  revalidatePath(`/admin/families/${familyId}`)
  revalidatePath("/admin/families")
  return saved("Person added.")
}

export async function updateTraveller(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  const familyId = text(formData, "family_id", 60)
  if (!isUuid(id) || !isUuid(familyId)) return failed("That person could not be found.")

  const label = text(formData, "label", 200)
  if (!label) return failed("Give the person a label such as 'Parent 1' or 'Child 1'.", "label")
  const band = oneOf(formData, "age_band", ageBand.enumValues)
  if (!band) return failed("Choose an age band.", "age_band")

  // A child's row is edited without the name and contact fields (the form leaves them out), so
  // whatever the row already holds is left alone instead of being overwritten with blanks.
  const withPerson = text(formData, "person_fields", 5) === "1"
  let person: PersonValues | null = null
  if (withPerson) {
    const parsed = readPerson(formData, band)
    if (!parsed.ok) return parsed.state
    person = parsed.values
  }

  try {
    const rows = await getDb()
      .update(travellers)
      .set({ label, ageBand: band, relationship: text(formData, "relationship", 200), ...(person ?? {}) })
      .where(and(eq(travellers.id, id), eq(travellers.familyId, familyId)))
      .returning({ id: travellers.id })
    if (rows.length === 0) return failed("That person no longer exists.")
  } catch (err) {
    return failed(dbMessage(err, TRAVELLER_CONSTRAINTS))
  }
  revalidatePath(`/admin/families/${familyId}`)
  return saved("Person saved.")
}

export async function removeTraveller(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  const familyId = text(formData, "family_id", 60)
  if (!isUuid(id) || !isUuid(familyId)) return failed("That person could not be found.")

  try {
    await getDb().delete(travellers).where(and(eq(travellers.id, id), eq(travellers.familyId, familyId)))
  } catch (err) {
    return failed(
      dbMessage(err, {
        booking_travellers_traveller_id_travellers_id_fk: "This person is on a booking. Remove them from the booking first.",
      }),
    )
  }
  revalidatePath(`/admin/families/${familyId}`)
  revalidatePath("/admin/families")
  return saved("Person removed.")
}

/* ----------------------------------- bookings ----------------------------------- */

const NEW_BOOKING_STATUSES = ["held", "waitlisted", "confirmed"] as const

export async function createBooking(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const familyId = text(formData, "family_id", 60)
  if (!isUuid(familyId)) return failed("That family could not be found.")
  const departureId = text(formData, "departure_id", 60)
  if (!isUuid(departureId)) return failed("Choose a departure.", "departure_id")

  const status = oneOf(formData, "status", NEW_BOOKING_STATUSES) ?? "held"

  const totalPriceCents = cents(formData, "total_price")
  if (totalPriceCents === undefined) return failed("Enter the price as a number, such as 4800 or 4800.50.", "total_price")
  if (totalPriceCents !== null && totalPriceCents < 0) return failed("The price can't be negative.", "total_price")

  const currencyInput = currency(formData, "currency")
  if (currencyInput === undefined) return failed("Currency must be a three-letter code such as usd or eur.", "currency")

  const db = getDb()
  let id: string
  try {
    const [departure] = await db
      .select({ currency: departures.currency, status: departures.status })
      .from(departures)
      .where(eq(departures.id, departureId))
      .limit(1)
    if (!departure) return failed("That departure no longer exists.", "departure_id")
    if (departure.status === "cancelled" || departure.status === "completed") {
      return failed("That departure is closed to new bookings (cancelled or completed).", "departure_id")
    }

    const [row] = await db
      .insert(bookings)
      .values({
        familyId,
        departureId,
        status,
        totalPriceCents,
        currency: currencyInput ?? departure.currency,
        ...(status === "confirmed" ? { confirmedAt: new Date() } : {}),
      })
      .returning({ id: bookings.id })
    if (!row) return failed("The booking was not saved. Try again.")
    id = row.id
  } catch (err) {
    return failed(dbMessage(err, BOOKING_CONSTRAINTS))
  }
  revalidatePath(`/admin/families/${familyId}`)
  revalidatePath("/admin/families")
  revalidatePath(`/admin/trips/${departureId}`)
  redirect(`/admin/bookings/${id}`)
}
