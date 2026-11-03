"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getDb } from "@/db/client"
import { journey, vendorCategory, vendorContacts, vendorStatus, vendors, type NewVendor } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { bool, currency, dbMessage, failed, int, isUuid, oneOf, saved, text, type FormState } from "@/lib/admin/forms"

const VENDOR_CONSTRAINTS = {
  vendors_rating_check: "Rating must be a whole number from 1 to 5.",
  vendors_country_code_check: "Country must be a two-letter code such as ES or GT.",
  vendors_currency_check: "Currency must be a three-letter code such as eur, gtq or usd.",
}

const CONTACT_CONSTRAINTS = {
  vendor_contacts_primary_idx: "This vendor already has a primary contact. Untick it on the other contact first.",
  vendor_contacts_vendor_id_vendors_id_fk: "That vendor no longer exists.",
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Parsed<T> = { ok: true; values: T } | { ok: false; state: FormState }

/** Blank, or an https address. A bare "example.com" gets https:// in front; http:// is refused. */
function readWebsite(fd: FormData): Parsed<string | null> {
  const raw = text(fd, "website", 500)
  if (raw === null) return { ok: true, values: null }
  if (/^http:\/\//i.test(raw)) return { ok: false, state: failed("Website must use https://.", "website") }
  const withScheme = /^https:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const u = new URL(withScheme)
    if (!u.hostname.includes(".")) throw new Error("no dot")
  } catch {
    return { ok: false, state: failed("That website address doesn't look right.", "website") }
  }
  return { ok: true, values: withScheme }
}

function readVendor(fd: FormData): Parsed<Omit<NewVendor, "id">> {
  const name = text(fd, "name", 200)
  if (!name) return { ok: false, state: failed("Give the vendor a name.", "name") }

  const category = oneOf(fd, "category", vendorCategory.enumValues)
  if (!category) return { ok: false, state: failed("Choose a category.", "category") }

  const status = oneOf(fd, "status", vendorStatus.enumValues) ?? "prospect"

  const journeyRaw = text(fd, "journey", 40)
  const journeyValue = oneOf(fd, "journey", journey.enumValues)
  if (journeyRaw !== null && journeyValue === null) return { ok: false, state: failed("Choose a destination from the list.", "journey") }

  const countryRaw = text(fd, "country_code", 10)
  const countryCode = countryRaw === null ? null : countryRaw.toUpperCase()
  if (countryCode !== null && !/^[A-Z]{2}$/.test(countryCode)) {
    return { ok: false, state: failed("Country must be a two-letter code such as ES or GT.", "country_code") }
  }

  const website = readWebsite(fd)
  if (!website.ok) return website

  const email = text(fd, "email", 320)
  if (email !== null && !EMAIL_RE.test(email)) return { ok: false, state: failed("That email address doesn't look right.", "email") }

  const defaultCurrency = currency(fd, "default_currency")
  if (defaultCurrency === undefined) {
    return { ok: false, state: failed("Currency must be a three-letter code such as eur, gtq or usd.", "default_currency") }
  }

  const rating = int(fd, "rating")
  if (rating === undefined || (rating !== null && (rating < 1 || rating > 5))) {
    return { ok: false, state: failed("Rating must be a whole number from 1 to 5.", "rating") }
  }

  return {
    ok: true,
    values: {
      name,
      category,
      isIndividual: bool(fd, "is_individual"),
      status,
      journey: journeyValue,
      city: text(fd, "city", 200),
      countryCode,
      website: website.values,
      email,
      phone: text(fd, "phone", 60),
      defaultCurrency,
      paymentTerms: text(fd, "payment_terms", 1000),
      rating,
      notes: text(fd, "notes", 4000),
    },
  }
}

export async function createVendor(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const parsed = readVendor(formData)
  if (!parsed.ok) return parsed.state

  let id: string
  try {
    const [row] = await getDb().insert(vendors).values(parsed.values).returning({ id: vendors.id })
    if (!row) return failed("The vendor was not saved. Try again.")
    id = row.id
  } catch (err) {
    return failed(dbMessage(err, VENDOR_CONSTRAINTS))
  }
  revalidatePath("/admin/vendors")
  redirect(`/admin/vendors/${id}`)
}

export async function updateVendor(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That vendor could not be found.")
  const parsed = readVendor(formData)
  if (!parsed.ok) return parsed.state

  try {
    const rows = await getDb().update(vendors).set(parsed.values).where(eq(vendors.id, id)).returning({ id: vendors.id })
    if (rows.length === 0) return failed("That vendor no longer exists.")
  } catch (err) {
    return failed(dbMessage(err, VENDOR_CONSTRAINTS))
  }
  revalidatePath(`/admin/vendors/${id}`)
  revalidatePath("/admin/vendors")
  return saved("Vendor saved.")
}

export async function deleteVendor(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That vendor could not be found.")

  try {
    await getDb().delete(vendors).where(eq(vendors.id, id))
  } catch (err) {
    return failed(
      dbMessage(err, {
        departure_services_vendor_id_vendors_id_fk: "This vendor has supplier lines or documents. Mark it inactive instead.",
        documents_vendor_id_vendors_id_fk: "This vendor has supplier lines or documents. Mark it inactive instead.",
      }),
    )
  }
  revalidatePath("/admin/vendors")
  redirect("/admin/vendors")
}

function readContact(fd: FormData): Parsed<{
  name: string
  role: string | null
  email: string | null
  phone: string | null
  prefersWhatsapp: boolean
  language: string | null
  isPrimary: boolean
  notes: string | null
}> {
  const name = text(fd, "name", 200)
  if (!name) return { ok: false, state: failed("Give the contact a name.", "name") }
  const email = text(fd, "email", 320)
  if (email !== null && !EMAIL_RE.test(email)) return { ok: false, state: failed("That email address doesn't look right.", "email") }
  return {
    ok: true,
    values: {
      name,
      role: text(fd, "role", 200),
      email,
      phone: text(fd, "phone", 60),
      prefersWhatsapp: bool(fd, "prefers_whatsapp"),
      language: text(fd, "language", 60),
      isPrimary: bool(fd, "is_primary"),
      notes: text(fd, "notes", 2000),
    },
  }
}

export async function addContact(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const vendorId = text(formData, "vendor_id", 60)
  if (!isUuid(vendorId)) return failed("That vendor could not be found.")
  const parsed = readContact(formData)
  if (!parsed.ok) return parsed.state

  try {
    await getDb().insert(vendorContacts).values({ vendorId, ...parsed.values })
  } catch (err) {
    return failed(dbMessage(err, CONTACT_CONSTRAINTS))
  }
  revalidatePath(`/admin/vendors/${vendorId}`)
  revalidatePath("/admin/vendors")
  return saved("Contact added.")
}

export async function updateContact(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  const vendorId = text(formData, "vendor_id", 60)
  if (!isUuid(id) || !isUuid(vendorId)) return failed("That contact could not be found.")
  const parsed = readContact(formData)
  if (!parsed.ok) return parsed.state

  try {
    const rows = await getDb()
      .update(vendorContacts)
      .set(parsed.values)
      .where(and(eq(vendorContacts.id, id), eq(vendorContacts.vendorId, vendorId)))
      .returning({ id: vendorContacts.id })
    if (rows.length === 0) return failed("That contact no longer exists.")
  } catch (err) {
    return failed(dbMessage(err, CONTACT_CONSTRAINTS))
  }
  revalidatePath(`/admin/vendors/${vendorId}`)
  revalidatePath("/admin/vendors")
  return saved("Contact saved.")
}

export async function removeContact(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  const vendorId = text(formData, "vendor_id", 60)
  if (!isUuid(id) || !isUuid(vendorId)) return failed("That contact could not be found.")

  try {
    await getDb().delete(vendorContacts).where(and(eq(vendorContacts.id, id), eq(vendorContacts.vendorId, vendorId)))
  } catch (err) {
    return failed(dbMessage(err))
  }
  revalidatePath(`/admin/vendors/${vendorId}`)
  revalidatePath("/admin/vendors")
  return saved("Contact removed.")
}
