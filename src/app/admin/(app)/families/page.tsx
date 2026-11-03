import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { ActionForm, Disclosure, SelectField } from "@/components/admin/fields"
import { Badge, Empty, FilterBar, LINK_CLASS, PageHeader, Section, Table } from "@/components/admin/kit"
import { getDb } from "@/db/client"
import { familyStatus, families } from "@/db/schema"
import { createFamily } from "@/lib/admin/actions/families"
import { requireAdmin } from "@/lib/admin/auth"
import { formatDateTime, humanize } from "@/lib/admin/format"
import { FAMILY_STATUS_OPTIONS, FamilyFields } from "./FamilyFields"

export const metadata: Metadata = { title: "Families" }

const CAP = 200

type Params = Promise<{ q?: string | string[]; status?: string | string[] }>

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ""
}

/** Escape LIKE wildcards so a typed "%" or "_" matches itself. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

export default async function FamiliesPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin()
  const sp = await searchParams
  const q = first(sp.q).slice(0, 100)
  const status = familyStatus.enumValues.find((v) => v === first(sp.status))

  const conditions: (SQL | undefined)[] = []
  if (q) {
    const pattern = likePattern(q)
    conditions.push(or(ilike(families.familyName, pattern), ilike(families.primaryContactName, pattern), ilike(families.email, pattern)))
  }
  if (status) conditions.push(eq(families.status, status))

  const rows = await getDb()
    .select({
      id: families.id,
      familyName: families.familyName,
      primaryContactName: families.primaryContactName,
      email: families.email,
      status: families.status,
      source: families.source,
      createdAt: families.createdAt,
      // Qualified by hand: in a single-table select Drizzle prints a bare "id", which would bind to the subquery.
      travellerCount: sql<number>`(select count(*)::int from travellers t where t.family_id = "families"."id")`,
      activeBookings: sql<number>`(select count(*)::int from bookings b where b.family_id = "families"."id" and b.status in ('held', 'confirmed'))`,
    })
    .from(families)
    .where(and(...conditions))
    .orderBy(desc(families.createdAt))
    .limit(CAP + 1)

  const capped = rows.length > CAP
  const shown = capped ? rows.slice(0, CAP) : rows
  const filtered = Boolean(q || status)

  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="Families"
        description="Households Avelune is talking to or travelling with: who is in each, which trips they are on, and what has been said."
      />

      <div className="mt-8">
        <Disclosure summary="Add a family">
          <ActionForm action={createFamily} submitLabel="Add family">
            <FamilyFields />
          </ActionForm>
        </Disclosure>
      </div>

      <FilterBar action="/admin/families">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="family-q" className="block text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-stone">
            Search
          </label>
          <input
            id="family-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Family, contact or email"
            className="w-full border-0 border-b border-ink/40 bg-transparent px-0 py-2 text-[0.9375rem] text-ink placeholder:text-stone focus:border-ink focus:outline-none"
          />
        </div>
        <div className="min-w-[10rem]">
          <SelectField name="status" label="Status" options={FAMILY_STATUS_OPTIONS} defaultValue={status} blank="All" />
        </div>
        {filtered ? (
          <Link href="/admin/families" className={LINK_CLASS}>
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Section title={filtered ? "Matching families" : "All families"}>
        {shown.length === 0 ? (
          <Empty>{filtered ? "No families match those filters." : "No families yet. Add the first one above."}</Empty>
        ) : (
          <Table
            columns={["Family", "Primary contact", "Email", "Status", "Source", "People", "Active bookings", "Added"]}
            rows={shown.map((f) => [
              <Link key="n" href={`/admin/families/${f.id}`} className={LINK_CLASS}>
                {f.familyName}
              </Link>,
              f.primaryContactName ?? "—",
              f.email,
              <Badge key="s" tone={f.status === "booked" ? "strong" : f.status === "inactive" ? "muted" : "plain"}>
                {humanize(f.status)}
              </Badge>,
              f.source ?? "—",
              <span key="t" className="tabular-nums">
                {f.travellerCount}
              </span>,
              <span key="b" className="tabular-nums">
                {f.activeBookings}
              </span>,
              <span key="c" className="whitespace-nowrap">
                {formatDateTime(f.createdAt)}
              </span>,
            ])}
          />
        )}
        {capped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the newest {CAP} families. Narrow the search to see others.</p> : null}
      </Section>
    </>
  )
}
