"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getDb } from "@/db/client"
import { documentKind, documentStatus, documents } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { date, dbMessage, failed, isUuid, oneOf, saved, text, type FormState } from "@/lib/admin/forms"

const CONSTRAINTS = {
  documents_url_required_check: "A document that is sent or on file needs a link. Add the https:// link, or set the status to requested or draft.",
  documents_url_check: "The link must start with https://.",
  documents_owner_check: "A document has to belong to a vendor, supplier line, trip or booking.",
  documents_vendor_id_vendors_id_fk: "That vendor no longer exists.",
  documents_departure_service_id_departure_services_id_fk: "That supplier line no longer exists.",
  documents_departure_id_departures_id_fk: "That trip no longer exists.",
  documents_booking_id_bookings_id_fk: "That booking no longer exists.",
}

/**
 * The panel posts its own page path so the right page refreshes; only admin pages are accepted.
 * "/admin/" is the panel's fallback when it cannot name its page: it refreshes every admin page.
 */
function readPath(fd: FormData): string | null {
  const p = text(fd, "path", 200)
  if (p === null || !p.startsWith("/admin/") || !/^\/admin\/[A-Za-z0-9\-_/]*$/.test(p) || p.includes("//")) return null
  return p
}

function refresh(path: string) {
  if (path === "/admin/") revalidatePath("/admin", "layout")
  else revalidatePath(path)
}

function readFields(fd: FormData):
  | {
      ok: true
      values: {
        title: string
        kind: (typeof documentKind.enumValues)[number]
        status: (typeof documentStatus.enumValues)[number]
        url: string | null
        datedOn: string | null
        expiresOn: string | null
        notes: string | null
      }
    }
  | { ok: false; state: FormState } {
  const title = text(fd, "title", 300)
  if (!title) return { ok: false, state: failed("Give the document a title.", "title") }

  const kind = oneOf(fd, "kind", documentKind.enumValues)
  if (!kind) return { ok: false, state: failed("Choose what kind of document it is.", "kind") }

  const status = oneOf(fd, "status", documentStatus.enumValues)
  if (!status) return { ok: false, state: failed("Choose a status.", "status") }

  // Links only. The scheme is lowercased because the database check is case-sensitive.
  let url = text(fd, "url", 2000)
  if (url !== null) {
    if (!/^https:\/\//i.test(url)) return { ok: false, state: failed("The link must start with https://.", "url") }
    url = `https://${url.slice("https://".length)}`
    try {
      new URL(url)
    } catch {
      return { ok: false, state: failed("That link doesn't look right.", "url") }
    }
  }
  if ((status === "sent" || status === "on_file") && url === null) {
    return { ok: false, state: failed("A document that is sent or on file needs a link. Add the https:// link, or set the status to requested or draft.", "url") }
  }

  const datedOn = date(fd, "dated_on")
  if (datedOn === undefined) return { ok: false, state: failed("Check the dated-on date.", "dated_on") }
  const expiresOn = date(fd, "expires_on")
  if (expiresOn === undefined) return { ok: false, state: failed("Check the expiry date.", "expires_on") }
  if (datedOn && expiresOn && expiresOn < datedOn) {
    return { ok: false, state: failed("The expiry date is before the date it was issued.", "expires_on") }
  }

  return { ok: true, values: { title, kind, status, url, datedOn, expiresOn, notes: text(fd, "notes", 2000) } }
}

export async function addDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const path = readPath(formData)
  if (!path) return failed("This form is missing its page. Reload and try again.")

  // Hidden owner ids: each is optional, but any that is present must be a uuid, and one is required.
  const owners: { vendorId: string | null; departureServiceId: string | null; departureId: string | null; bookingId: string | null } = {
    vendorId: null,
    departureServiceId: null,
    departureId: null,
    bookingId: null,
  }
  const sources = [
    ["vendor_id", "vendorId"],
    ["departure_service_id", "departureServiceId"],
    ["departure_id", "departureId"],
    ["booking_id", "bookingId"],
  ] as const
  for (const [field, key] of sources) {
    const v = text(formData, field, 60)
    if (v === null) continue
    if (!isUuid(v)) return failed("That document's owner could not be found.")
    owners[key] = v
  }
  if (Object.values(owners).every((v) => v === null)) return failed("This form is missing the record it belongs to. Reload and try again.")

  const parsed = readFields(formData)
  if (!parsed.ok) return parsed.state

  try {
    await getDb().insert(documents).values({ ...owners, ...parsed.values })
  } catch (err) {
    return failed(dbMessage(err, CONSTRAINTS))
  }
  refresh(path)
  return saved("Document added.")
}

export async function updateDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const path = readPath(formData)
  if (!path) return failed("This form is missing its page. Reload and try again.")
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That document could not be found.")
  const parsed = readFields(formData)
  if (!parsed.ok) return parsed.state

  try {
    const rows = await getDb().update(documents).set(parsed.values).where(eq(documents.id, id)).returning({ id: documents.id })
    if (rows.length === 0) return failed("That document no longer exists.")
  } catch (err) {
    return failed(dbMessage(err, CONSTRAINTS))
  }
  refresh(path)
  return saved("Document saved.")
}

export async function deleteDocument(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const path = readPath(formData)
  if (!path) return failed("This form is missing its page. Reload and try again.")
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That document could not be found.")

  try {
    await getDb().delete(documents).where(eq(documents.id, id))
  } catch (err) {
    return failed(dbMessage(err))
  }
  refresh(path)
  return saved("Document deleted.")
}
