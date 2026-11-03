"use server"

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getDb } from "@/db/client"
import { interactionKind, interactions } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { date, dbMessage, failed, isUuid, oneOf, pacificDateTime, saved, text, type FormState } from "@/lib/admin/forms"

const CONSTRAINTS = {
  interactions_subject_check: "An entry has to belong to a family, vendor or trip.",
  interactions_family_id_families_id_fk: "That family no longer exists.",
  interactions_vendor_id_vendors_id_fk: "That vendor no longer exists.",
  interactions_departure_id_departures_id_fk: "That trip no longer exists.",
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

export async function addInteraction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const path = readPath(formData)
  if (!path) return failed("This form is missing its page. Reload and try again.")

  const subjects: { familyId: string | null; vendorId: string | null; departureId: string | null } = {
    familyId: null,
    vendorId: null,
    departureId: null,
  }
  for (const [field, key] of [
    ["family_id", "familyId"],
    ["vendor_id", "vendorId"],
    ["departure_id", "departureId"],
  ] as const) {
    const v = text(formData, field, 60)
    if (v === null) continue
    if (!isUuid(v)) return failed("The record this entry belongs to could not be found.")
    subjects[key] = v
  }
  if (Object.values(subjects).every((v) => v === null)) {
    return failed("This form is missing the record it belongs to. Reload and try again.")
  }

  const summary = text(formData, "summary", 2000)
  if (!summary) return failed("Write a line about what was said or decided.", "summary")

  const kind = oneOf(formData, "kind", interactionKind.enumValues) ?? "note"

  // Blank means now: leave the column out so the database default applies.
  const occurredAt = pacificDateTime(formData, "occurred_at")
  if (occurredAt === undefined) return failed("Check the date and time.", "occurred_at")

  const followUpOn = date(formData, "follow_up_on")
  if (followUpOn === undefined) return failed("Check the follow-up date.", "follow_up_on")

  try {
    await getDb()
      .insert(interactions)
      .values({ ...subjects, kind, summary, followUpOn, ...(occurredAt ? { occurredAt } : {}) })
  } catch (err) {
    return failed(dbMessage(err, CONSTRAINTS))
  }
  refresh(path)
  return saved("Entry added.")
}

export async function completeFollowUp(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const path = readPath(formData)
  if (!path) return failed("This form is missing its page. Reload and try again.")
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That entry could not be found.")

  try {
    const rows = await getDb()
      .update(interactions)
      .set({ followUpDoneAt: sql`now()` })
      .where(and(eq(interactions.id, id), isNotNull(interactions.followUpOn), isNull(interactions.followUpDoneAt)))
      .returning({ id: interactions.id })
    if (rows.length === 0) return failed("That follow-up is already done, or the entry is gone.")
  } catch (err) {
    return failed(dbMessage(err, CONSTRAINTS))
  }
  refresh(path)
  return saved("Follow-up marked done.")
}

export async function deleteInteraction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const path = readPath(formData)
  if (!path) return failed("This form is missing its page. Reload and try again.")
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That entry could not be found.")

  try {
    await getDb().delete(interactions).where(eq(interactions.id, id))
  } catch (err) {
    return failed(dbMessage(err, CONSTRAINTS))
  }
  refresh(path)
  return saved("Entry deleted.")
}
