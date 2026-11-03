import { desc, eq } from "drizzle-orm"
import { getDb } from "@/db/client"
import { families, signups } from "@/db/schema"
import { isAdmin } from "@/lib/admin/auth"
import { csvCell } from "@/lib/signups/csv"
import { readSignupFilters, signupWhere } from "../filters"

const COLUMNS = [
  "created_at",
  "email",
  "name",
  "children_count",
  "children_ages",
  "destinations",
  "notes",
  "source",
  "referrer",
  "utm",
  "status",
  "consent_at",
  "consent_version",
  "family_id",
] as const

export async function GET(request: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 })

  const params = Object.fromEntries(new URL(request.url).searchParams)
  const filters = readSignupFilters(params)

  // ip_hash, user_agent and confirm_token are never selected.
  const rows = await getDb()
    .select({
      createdAt: signups.createdAt,
      email: signups.email,
      name: signups.name,
      childrenCount: signups.childrenCount,
      childrenAges: signups.childrenAges,
      destinations: signups.destinations,
      notes: signups.notes,
      source: signups.source,
      referrer: signups.referrer,
      utm: signups.utm,
      status: signups.status,
      consentAt: signups.consentAt,
      consentVersion: signups.consentVersion,
      familyId: families.id,
    })
    .from(signups)
    .leftJoin(families, eq(families.signupId, signups.id))
    .where(signupWhere(filters))
    .orderBy(desc(signups.createdAt), desc(signups.id))

  const lines = [COLUMNS.join(",")]
  for (const r of rows) {
    lines.push(
      [
        r.createdAt,
        r.email,
        r.name,
        r.childrenCount,
        r.childrenAges,
        r.destinations?.join("|"),
        r.notes,
        r.source,
        r.referrer,
        r.utm && Object.keys(r.utm).length > 0 ? JSON.stringify(r.utm) : null,
        r.status,
        r.consentAt,
        r.consentVersion,
        r.familyId,
      ]
        .map(csvCell)
        .join(","),
    )
  }

  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date())
  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="avelune-early-access-${day}.csv"`,
      "cache-control": "no-store",
    },
  })
}
