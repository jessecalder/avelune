import { and, asc, eq, ilike, or, sql, type SQL } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { ActionForm, Disclosure, SelectField } from "@/components/admin/fields"
import { Badge, Empty, FilterBar, LINK_CLASS, PageHeader, Section, Table } from "@/components/admin/kit"
import { getDb } from "@/db/client"
import { journey, vendorCategory, vendorStatus, vendors } from "@/db/schema"
import { createVendor } from "@/lib/admin/actions/vendors"
import { requireAdmin } from "@/lib/admin/auth"
import { JOURNEY_LABELS, humanize } from "@/lib/admin/format"
import { CATEGORY_OPTIONS, JOURNEY_OPTIONS, STATUS_OPTIONS, VendorFields } from "./VendorFields"

export const metadata: Metadata = { title: "Vendors" }

const CAP = 200

type Params = Promise<{ q?: string | string[]; category?: string | string[]; journey?: string | string[]; status?: string | string[] }>

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ""
}

/** Escape LIKE wildcards so a typed "%" or "_" matches itself. */
function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

export default async function VendorsPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin()
  const sp = await searchParams
  const q = first(sp.q).slice(0, 100)
  const category = vendorCategory.enumValues.find((v) => v === first(sp.category))
  const journeyFilter = journey.enumValues.find((v) => v === first(sp.journey))
  const status = vendorStatus.enumValues.find((v) => v === first(sp.status))

  const conditions: (SQL | undefined)[] = []
  if (q) {
    const pattern = likePattern(q)
    conditions.push(or(ilike(vendors.name, pattern), ilike(vendors.city, pattern), ilike(vendors.email, pattern)))
  }
  if (category) conditions.push(eq(vendors.category, category))
  if (journeyFilter) conditions.push(eq(vendors.journey, journeyFilter))
  if (status) conditions.push(eq(vendors.status, status))

  const rows = await getDb()
    .select({
      id: vendors.id,
      name: vendors.name,
      isIndividual: vendors.isIndividual,
      category: vendors.category,
      journey: vendors.journey,
      city: vendors.city,
      countryCode: vendors.countryCode,
      status: vendors.status,
      rating: vendors.rating,
      // Qualified by hand: in a single-table select Drizzle prints a bare "id", which would bind to the subquery.
      primaryContact: sql<string | null>`(select vc.name from vendor_contacts vc where vc.vendor_id = "vendors"."id" and vc.is_primary limit 1)`,
      lineCount: sql<number>`(select count(*)::int from departure_services ds where ds.vendor_id = "vendors"."id")`,
    })
    .from(vendors)
    .where(and(...conditions))
    .orderBy(asc(vendors.name))
    .limit(CAP + 1)

  const capped = rows.length > CAP
  const shown = capped ? rows.slice(0, CAP) : rows
  const filtered = Boolean(q || category || journeyFilter || status)

  return (
    <>
      <PageHeader
        eyebrow="Suppliers"
        title="Vendors"
        description="Houses, hosts, guides, transfers, restaurants and activity operators, with the people to call and the paperwork on file."
      />

      <div className="mt-8">
        <Disclosure summary="Add a vendor">
          <ActionForm action={createVendor} submitLabel="Add vendor">
            <VendorFields />
          </ActionForm>
        </Disclosure>
      </div>

      <FilterBar action="/admin/vendors">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="vendor-q" className="block text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-stone">
            Search
          </label>
          <input
            id="vendor-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, city or email"
            className="w-full border-0 border-b border-ink/40 bg-transparent px-0 py-2 text-[0.9375rem] text-ink placeholder:text-stone focus:border-ink focus:outline-none"
          />
        </div>
        <div className="min-w-[10rem]">
          <SelectField name="category" label="Category" options={CATEGORY_OPTIONS} defaultValue={category} blank="All" />
        </div>
        <div className="min-w-[10rem]">
          <SelectField name="journey" label="Destination" options={JOURNEY_OPTIONS} defaultValue={journeyFilter} blank="All" />
        </div>
        <div className="min-w-[10rem]">
          <SelectField name="status" label="Status" options={STATUS_OPTIONS} defaultValue={status} blank="All" />
        </div>
        {filtered ? (
          <Link href="/admin/vendors" className={LINK_CLASS}>
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Section title={filtered ? "Matching vendors" : "All vendors"}>
        {shown.length === 0 ? (
          <Empty>{filtered ? "No vendors match those filters." : "No vendors yet. Add the first one above."}</Empty>
        ) : (
          <Table
            columns={["Vendor", "Category", "Destination", "Place", "Status", "Rating", "Primary contact", "Lines"]}
            rows={shown.map((v) => [
              <span key="n" className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/vendors/${v.id}`} className={LINK_CLASS}>
                  {v.name}
                </Link>
                {v.isIndividual ? <Badge tone="muted">Individual</Badge> : null}
              </span>,
              humanize(v.category),
              v.journey ? (JOURNEY_LABELS[v.journey] ?? v.journey) : "Both / any",
              [v.city, v.countryCode].filter(Boolean).join(" · ") || "—",
              <Badge key="s" tone={v.status === "contracted" ? "strong" : v.status === "declined" || v.status === "inactive" ? "muted" : "plain"}>
                {humanize(v.status)}
              </Badge>,
              v.rating ? `★ ${v.rating}` : "—",
              v.primaryContact ?? "—",
              <span key="l" className="tabular-nums">
                {v.lineCount}
              </span>,
            ])}
          />
        )}
        {capped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the first {CAP} vendors. Narrow the search to see others.</p> : null}
      </Section>
    </>
  )
}
