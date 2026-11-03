"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getDb } from "@/db/client"
import {
  ageBand,
  departureServices,
  departures,
  rateUnit,
  serviceStatus,
  vendorCategory,
  vendors,
  type NewDepartureService,
} from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { cents, currency, date, dbMessage, failed, isUuid, oneOf, saved, text, type FormState } from "@/lib/admin/forms"

const VENDOR_NEEDED = "Choose a vendor before marking the line requested, quoted, held or confirmed."

const SERVICE_CONSTRAINTS = {
  departure_services_vendor_check: VENDOR_NEEDED,
  departure_services_dates_check: "The end date can't be before the start date.",
  departure_services_amounts_check: "Rate and paid can't be negative, and the quantity must be more than zero.",
  departure_services_currency_check: "Currency must be a three-letter code such as eur, gtq or usd.",
  departure_services_vendor_id_vendors_id_fk: "That vendor no longer exists.",
  departure_services_departure_id_departures_id_fk: "That departure no longer exists.",
}

// integer columns hold up to 2,147,483,647 cents.
const MAX_CENTS = 2_000_000_000

type Parsed<T> = { ok: true; values: T } | { ok: false; state: FormState }

/** Money field: blank is null, otherwise zero or more and small enough to store. */
function money(fd: FormData, name: string, label: string): Parsed<number | null> {
  const v = cents(fd, name)
  if (v === undefined) return { ok: false, state: failed(`${label} must be an amount such as 1,250.00.`, name) }
  if (v !== null && (v < 0 || v > MAX_CENTS)) {
    return { ok: false, state: failed(`${label} must be zero or more, and under 20 million.`, name) }
  }
  return { ok: true, values: v }
}

function optionalDate(fd: FormData, name: string, label: string): Parsed<string | null> {
  const v = date(fd, name)
  if (v === undefined) return { ok: false, state: failed(`${label} must be a date.`, name) }
  return { ok: true, values: v }
}

/** The fields before the currency is settled (that needs the database). */
type ServiceValues = Omit<NewDepartureService, "id" | "departureId" | "currency"> & { currencyInput: string | null }

function readService(fd: FormData): Parsed<ServiceValues> {
  const vendorRaw = text(fd, "vendor_id", 60)
  if (vendorRaw !== null && !isUuid(vendorRaw)) return { ok: false, state: failed("Choose a vendor from the list.", "vendor_id") }

  const category = oneOf(fd, "category", vendorCategory.enumValues)
  if (!category) return { ok: false, state: failed("Choose a category.", "category") }

  const title = text(fd, "title", 200)
  if (!title) return { ok: false, state: failed("Give the line a title.", "title") }

  const bandRaw = text(fd, "age_band", 40)
  const band = oneOf(fd, "age_band", ageBand.enumValues)
  if (bandRaw !== null && band === null) return { ok: false, state: failed("Choose an age band from the list.", "age_band") }

  const startsOn = optionalDate(fd, "starts_on", "Start date")
  if (!startsOn.ok) return startsOn
  const endsOn = optionalDate(fd, "ends_on", "End date")
  if (!endsOn.ok) return endsOn
  if (startsOn.values && endsOn.values && endsOn.values < startsOn.values) {
    return { ok: false, state: failed("The end date can't be before the start date.", "ends_on") }
  }

  const startTime = text(fd, "start_time", 10)
  if (startTime !== null && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return { ok: false, state: failed("Start time must be 24-hour, like 09:30 or 18:00.", "start_time") }
  }

  const status = oneOf(fd, "status", serviceStatus.enumValues) ?? "needed"
  if (!vendorRaw && status !== "needed" && status !== "cancelled") return { ok: false, state: failed(VENDOR_NEEDED, "vendor_id") }

  const unit = oneOf(fd, "rate_unit", rateUnit.enumValues) ?? "flat"

  const unitRate = money(fd, "unit_rate", "Unit rate")
  if (!unitRate.ok) return unitRate
  const usdEstimate = money(fd, "usd_estimate", "USD estimate")
  if (!usdEstimate.ok) return usdEstimate
  const paid = money(fd, "paid", "Paid")
  if (!paid.ok) return paid

  const quantityRaw = text(fd, "quantity", 20) ?? "1"
  const quantityOk = /^\d{1,8}(\.\d{1,2})?$/.test(quantityRaw) && Number(quantityRaw) > 0
  if (!quantityOk) return { ok: false, state: failed("Quantity must be a number above zero, with at most two decimals.", "quantity") }

  const currencyInput = currency(fd, "currency")
  if (currencyInput === undefined) {
    return { ok: false, state: failed("Currency must be a three-letter code such as eur, gtq or usd.", "currency") }
  }

  const quoteValidUntil = optionalDate(fd, "quote_valid_until", "Quote valid until")
  if (!quoteValidUntil.ok) return quoteValidUntil
  const depositDueOn = optionalDate(fd, "deposit_due_on", "Deposit due")
  if (!depositDueOn.ok) return depositDueOn
  const balanceDueOn = optionalDate(fd, "balance_due_on", "Balance due")
  if (!balanceDueOn.ok) return balanceDueOn

  return {
    ok: true,
    values: {
      vendorId: vendorRaw,
      category,
      title,
      description: text(fd, "description", 2000),
      ageBand: band,
      startsOn: startsOn.values,
      endsOn: endsOn.values,
      startTime,
      status,
      rateUnit: unit,
      unitRateCents: unitRate.values,
      quantity: quantityRaw,
      usdEstimateCents: usdEstimate.values,
      quoteValidUntil: quoteValidUntil.values,
      confirmationRef: text(fd, "confirmation_ref", 200),
      depositDueOn: depositDueOn.values,
      balanceDueOn: balanceDueOn.values,
      paidCents: paid.values ?? 0,
      cancellationTerms: text(fd, "cancellation_terms", 4000),
      notes: text(fd, "notes", 4000),
      currencyInput,
    },
  }
}

/** A typed currency wins; otherwise the vendor's, otherwise the departure's. */
async function settleCurrency(typed: string | null, vendorId: string | null, departureCurrency: string): Promise<string> {
  if (typed) return typed
  if (vendorId) {
    const [v] = await getDb().select({ c: vendors.defaultCurrency }).from(vendors).where(eq(vendors.id, vendorId)).limit(1)
    if (v?.c) return v.c
  }
  return departureCurrency
}

function refresh(departureId: string, ...vendorIds: (string | null | undefined)[]) {
  revalidatePath(`/admin/trips/${departureId}`)
  for (const v of new Set(vendorIds)) if (v) revalidatePath(`/admin/vendors/${v}`)
}

export async function addService(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const departureId = text(formData, "departure_id", 60)
  if (!isUuid(departureId)) return failed("That departure could not be found.")
  const parsed = readService(formData)
  if (!parsed.ok) return parsed.state

  try {
    const [dep] = await getDb().select({ currency: departures.currency }).from(departures).where(eq(departures.id, departureId)).limit(1)
    if (!dep) return failed("That departure no longer exists.")
    const { currencyInput, ...values } = parsed.values
    const settled = await settleCurrency(currencyInput, values.vendorId ?? null, dep.currency)
    await getDb()
      .insert(departureServices)
      .values({ ...values, departureId, currency: settled })
  } catch (err) {
    return failed(dbMessage(err, SERVICE_CONSTRAINTS))
  }
  refresh(departureId, parsed.values.vendorId)
  return saved("Line added.")
}

export async function updateService(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  const departureId = text(formData, "departure_id", 60)
  if (!isUuid(id) || !isUuid(departureId)) return failed("That line could not be found.")
  const parsed = readService(formData)
  if (!parsed.ok) return parsed.state

  try {
    const db = getDb()
    const [existing] = await db
      .select({ vendorId: departureServices.vendorId, depCurrency: departures.currency })
      .from(departureServices)
      .innerJoin(departures, eq(departures.id, departureServices.departureId))
      .where(and(eq(departureServices.id, id), eq(departureServices.departureId, departureId)))
      .limit(1)
    if (!existing) return failed("That line no longer exists.")
    const { currencyInput, ...values } = parsed.values
    const settled = await settleCurrency(currencyInput, values.vendorId ?? null, existing.depCurrency)
    // total_cents is generated by the database and is never written.
    await db
      .update(departureServices)
      .set({ ...values, currency: settled })
      .where(and(eq(departureServices.id, id), eq(departureServices.departureId, departureId)))
    refresh(departureId, existing.vendorId, values.vendorId)
  } catch (err) {
    return failed(dbMessage(err, SERVICE_CONSTRAINTS))
  }
  return saved("Line saved.")
}

export async function deleteService(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  const departureId = text(formData, "departure_id", 60)
  if (!isUuid(id) || !isUuid(departureId)) return failed("That line could not be found.")

  try {
    const [row] = await getDb()
      .delete(departureServices)
      .where(and(eq(departureServices.id, id), eq(departureServices.departureId, departureId)))
      .returning({ vendorId: departureServices.vendorId })
    refresh(departureId, row?.vendorId)
  } catch (err) {
    return failed(
      dbMessage(err, {
        documents_departure_service_id_departure_services_id_fk: "This line has documents. Remove or move them first.",
      }),
    )
  }
  return saved("Line deleted.")
}
