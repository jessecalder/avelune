"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getDb } from "@/db/client"
import { families, signups } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { dbMessage, failed, isUuid, saved, text, type FormState } from "@/lib/admin/forms"

const FAMILY_CONSTRAINTS = {
  families_email_key_idx: "A family with this email already exists.",
  families_signup_id_idx: "This signup already has a family.",
  families_signup_id_signups_id_fk: "That signup no longer exists.",
}

export async function createFamilyFromSignup(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const signupId = text(formData, "signup_id", 60)
  if (!isUuid(signupId)) return failed("That signup could not be found.")
  const familyName = text(formData, "family_name", 200)
  if (!familyName) return failed("Give the family a name.", "family_name")
  const contactName = text(formData, "primary_contact_name", 200)

  const db = getDb()
  let familyId: string
  try {
    const [signup] = await db.select().from(signups).where(eq(signups.id, signupId)).limit(1)
    if (!signup) return failed("That signup no longer exists.")
    const [row] = await db
      .insert(families)
      .values({
        signupId: signup.id,
        familyName,
        primaryContactName: contactName,
        email: signup.email,
        status: "lead",
        source: "early_access",
        notes: signup.notes,
      })
      .returning({ id: families.id })
    if (!row) return failed("The family was not saved. Try again.")
    familyId = row.id
  } catch (err) {
    return failed(dbMessage(err, FAMILY_CONSTRAINTS))
  }
  revalidatePath(`/admin/signups/${signupId}`)
  revalidatePath("/admin/signups")
  revalidatePath("/admin/families")
  redirect(`/admin/families/${familyId}`)
}

export async function markSignupUnsubscribed(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That signup could not be found.")
  try {
    const rows = await getDb().update(signups).set({ status: "unsubscribed", updatedAt: new Date() }).where(eq(signups.id, id)).returning({ id: signups.id })
    if (rows.length === 0) return failed("That signup no longer exists.")
  } catch (err) {
    return failed(dbMessage(err))
  }
  revalidatePath(`/admin/signups/${id}`)
  revalidatePath("/admin/signups")
  return saved("Marked unsubscribed.")
}

export async function deleteSignup(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const id = text(formData, "id", 60)
  if (!isUuid(id)) return failed("That signup could not be found.")
  try {
    // families.signup_id and reservations.signup_id are SET NULL, so a family or deposit keeps its own copy.
    await getDb().delete(signups).where(eq(signups.id, id))
  } catch (err) {
    return failed(dbMessage(err))
  }
  revalidatePath("/admin/signups")
  revalidatePath("/admin")
  redirect("/admin/signups")
}
