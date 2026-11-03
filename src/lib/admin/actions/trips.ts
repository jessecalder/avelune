"use server"

import { and, eq, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getDb } from "@/db/client"
import { departureStatus, departures, journey, type NewDeparture } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { currency, date, dbMessage, failed, int, isUuid, oneOf, saved, text, type FormState } from "@/lib/admin/forms"

const DEPARTURE_CONSTRAINTS = {
  departures_code_idx: "That code is already used.",
  departures_journey_starts_on_idx: "There is already a departure of that journey starting that day.",
  departures_dates_check: "The end date must be after the start date.",
  departures_capacity_check: "Maximum families must be at least the minimum, and the minimum at least 1.",
  departures_currency_check: "Currency must be a three-letter code such as usd or eur.",
}

type Parsed<T> = { ok: true; values: T } | { ok: false; state: FormState }

/** Everything the add and edit forms share. `status` is only read when the form carries it (edit). */
function readDeparture(fd: FormData): Parsed<Omit<NewDeparture, "id">> {
  const code = text(fd, "code", 40)?.toUpperCase() ?? null
  if (!code) return { ok: false, state: failed("Give the departure a code, such as SSB-2027-07.", "code") }
  if (!/^[A-Z0-9][A-Z0-9-]*$/.test(code)) {
    return { ok: false, state: failed("The code can use capital letters, digits and hyphens only, such as SSB-2027-07.", "code") }
  }

  const journeyValue = oneOf(fd, "journey", journey.enumValues)
  if (!journeyValue) return { ok: false, state: failed("Choose a journey.", "journey") }

  const name = text(fd, "name", 200)
  if (!name) return { ok: false, state: failed("Give the departure a name.", "name") }

  const startsOn = date(fd, "starts_on")
  if (!startsOn) return { ok: false, state: failed("Enter the first day as a date.", "starts_on") }
  const endsOn = date(fd, "ends_on")
  if (!endsOn) return { ok: false, state: failed("Enter the last day as a date.", "ends_on") }
  if (endsOn <= startsOn) return { ok: false, state: failed("The end date must be after the start date.", "ends_on") }

  const minFamilies = int(fd, "min_families") ?? 6
  const maxFamilies = int(fd, "max_families") ?? 10
  if (minFamilies === undefined || minFamilies < 1 || minFamilies > 999) {
    return { ok: false, state: failed("Minimum families must be a whole number from 1 to 999.", "min_families") }
  }
  if (maxFamilies === undefined || maxFamilies > 999) {
    return { ok: false, state: failed("Maximum families must be a whole number up to 999.", "max_families") }
  }
  if (maxFamilies < minFamilies) {
    return { ok: false, state: failed("Maximum families can't be fewer than the minimum.", "max_families") }
  }

  const currencyValue = currency(fd, "currency")
  if (currencyValue === undefined) {
    return { ok: false, state: failed("Currency must be a three-letter code such as usd or eur.", "currency") }
  }

  const balanceDueOn = date(fd, "balance_due_on")
  if (balanceDueOn === undefined) return { ok: false, state: failed("Enter the balance due date as a date.", "balance_due_on") }

  const values: Omit<NewDeparture, "id"> = {
    code,
    journey: journeyValue,
    name,
    startsOn,
    endsOn,
    minFamilies,
    maxFamilies,
    currency: currencyValue ?? "usd",
    balanceDueOn,
    priceNote: text(fd, "price_note", 1000),
    notes: text(fd, "notes", 4000),
  }

  if (fd.has("status")) {
    const status = oneOf(fd, "status", departureStatus.enumValues)
    if (!status) return { ok: false, state: failed("Choose a status.", "status") }
    values.status = status
  }
  return { ok: true, values }
}

export async function createDeparture(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const parsed = readDeparture(formData)
  if (!parsed.ok) return parsed.state

  let id: string
  try {
    const [row] = await getDb().insert(departures).values(parsed.values).returning({ id: departures.id })
    if (!row) return failed("The departure was not saved. Try again.")
    id = row.id
  } catch (err) {
    return failed(dbMessage(err, DEPARTURE_CONSTRAINTS))
  }
  revalidatePath("/admin/trips")
  redirect(`/admin/trips/${id}`)
}

export async function updateDeparture(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That departure could not be found.")
  const parsed = readDeparture(formData)
  if (!parsed.ok) return parsed.state

  try {
    const rows = await getDb().update(departures).set(parsed.values).where(eq(departures.id, id)).returning({ id: departures.id })
    if (rows.length === 0) return failed("That departure no longer exists.")
  } catch (err) {
    return failed(dbMessage(err, DEPARTURE_CONSTRAINTS))
  }
  revalidatePath(`/admin/trips/${id}`)
  revalidatePath("/admin/trips")
  return saved("Departure saved.")
}

/** Records that Jesse has declared the departure will run. Keeps the first date if clicked twice. */
export async function markGuaranteed(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That departure could not be found.")

  try {
    await getDb()
      .update(departures)
      .set({ guaranteedAt: new Date() })
      .where(and(eq(departures.id, id), isNull(departures.guaranteedAt)))
  } catch (err) {
    return failed(dbMessage(err))
  }
  revalidatePath(`/admin/trips/${id}`)
  revalidatePath("/admin/trips")
  return saved("Marked as guaranteed.")
}

export async function clearGuaranteed(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That departure could not be found.")

  try {
    await getDb().update(departures).set({ guaranteedAt: null }).where(eq(departures.id, id))
  } catch (err) {
    return failed(dbMessage(err))
  }
  revalidatePath(`/admin/trips/${id}`)
  revalidatePath("/admin/trips")
  return saved("Guarantee cleared.")
}

export async function deleteDeparture(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That departure could not be found.")

  try {
    await getDb().delete(departures).where(eq(departures.id, id))
  } catch (err) {
    return failed(
      dbMessage(err, {
        bookings_departure_id_departures_id_fk: "This departure has bookings or supplier lines.",
        departure_services_departure_id_departures_id_fk: "This departure has bookings or supplier lines.",
        documents_departure_id_departures_id_fk: "This departure has documents. Remove them first.",
      }),
    )
  }
  revalidatePath("/admin/trips")
  redirect("/admin/trips")
}
