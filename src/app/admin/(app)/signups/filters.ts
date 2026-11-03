import { and, eq, exists, ilike, not, or, sql, type SQL } from "drizzle-orm"
import { families, signupStatus, signups } from "@/db/schema"

export const DESTINATION_FILTERS = ["san-sebastian", "antigua", "anywhere"] as const

export type SignupFilters = {
  q: string
  status?: (typeof signupStatus.enumValues)[number]
  destination?: (typeof DESTINATION_FILTERS)[number]
  converted?: "yes" | "no"
}

type RawParams = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ""
}

/** Escape LIKE wildcards so a typed "%" or "_" matches itself. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

/** Reads the filter query string; unknown values are ignored rather than rejected. */
export function readSignupFilters(sp: RawParams): SignupFilters {
  const converted = first(sp.converted)
  return {
    q: first(sp.q).slice(0, 100),
    status: signupStatus.enumValues.find((v) => v === first(sp.status)),
    destination: DESTINATION_FILTERS.find((v) => v === first(sp.destination)),
    converted: converted === "yes" || converted === "no" ? converted : undefined,
  }
}

export function signupFilterActive(f: SignupFilters): boolean {
  return Boolean(f.q || f.status || f.destination || f.converted)
}

/** The same filters as a query string (no leading "?"), for links and the CSV export. */
export function signupFilterQuery(f: SignupFilters, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams()
  if (f.q) p.set("q", f.q)
  if (f.status) p.set("status", f.status)
  if (f.destination) p.set("destination", f.destination)
  if (f.converted) p.set("converted", f.converted)
  for (const [k, v] of Object.entries(extra)) p.set(k, v)
  return p.toString()
}

export function signupWhere(f: SignupFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = []
  if (f.q) {
    const pattern = likePattern(f.q)
    conditions.push(or(ilike(signups.email, pattern), ilike(signups.name, pattern)))
  }
  if (f.status) conditions.push(eq(signups.status, f.status))
  if (f.destination) conditions.push(sql`${f.destination} = ANY(${signups.destinations})`)
  if (f.converted) {
    const hasFamily = exists(
      sql`(select 1 from ${families} where ${families.signupId} = ${signups.id})`,
    )
    conditions.push(f.converted === "yes" ? hasFamily : not(hasFamily))
  }
  return and(...conditions)
}
