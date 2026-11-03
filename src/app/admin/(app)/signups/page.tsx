import { count, desc, eq } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { SelectField } from "@/components/admin/fields"
import { Badge, ButtonLink, Empty, FilterBar, LINK_CLASS, PageHeader, Section, Table } from "@/components/admin/kit"
import { MICRO_CLASS } from "@/components/maison/primitives"
import { getDb } from "@/db/client"
import { families, signups } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { JOURNEY_LABELS, formatDateTime, humanize } from "@/lib/admin/format"
import { readSignupFilters, signupFilterActive, signupFilterQuery, signupWhere } from "./filters"

export const metadata: Metadata = { title: "Early access" }

const PAGE_SIZE = 50

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "unsubscribed", label: "Unsubscribed" },
]
const DESTINATION_OPTIONS = [
  { value: "san-sebastian", label: "San Sebastián" },
  { value: "antigua", label: "Antigua" },
  { value: "anywhere", label: "Anywhere" },
]
const CONVERTED_OPTIONS = [
  { value: "yes", label: "Has a family" },
  { value: "no", label: "No family yet" },
]

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default async function SignupsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()
  const sp = await searchParams
  const filters = readSignupFilters(sp)
  const filtered = signupFilterActive(filters)
  const where = signupWhere(filters)

  const db = getDb()
  const [totalRow] = await db.select({ n: count() }).from(signups).where(where)
  const total = totalRow?.n ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rawPage = Number.parseInt(Array.isArray(sp.page) ? (sp.page[0] ?? "") : (sp.page ?? ""), 10)
  const page = Number.isInteger(rawPage) ? Math.min(Math.max(rawPage, 1), pages) : 1

  const rows = await db
    .select({
      id: signups.id,
      createdAt: signups.createdAt,
      email: signups.email,
      name: signups.name,
      childrenAges: signups.childrenAges,
      destinations: signups.destinations,
      source: signups.source,
      status: signups.status,
      familyId: families.id,
    })
    .from(signups)
    .leftJoin(families, eq(families.signupId, signups.id))
    .where(where)
    .orderBy(desc(signups.createdAt), desc(signups.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)

  const pageHref = (n: number) => {
    const qs = signupFilterQuery(filters, n > 1 ? { page: String(n) } : {})
    return qs ? `/admin/signups?${qs}` : "/admin/signups"
  }
  const exportQs = signupFilterQuery(filters)

  return (
    <>
      <PageHeader
        eyebrow="Early access"
        title="Early-access list"
        description="Everyone who asked to hear first. A signup becomes a family when you start a conversation with them."
        actions={<ButtonLink href={exportQs ? `/admin/signups/export?${exportQs}` : "/admin/signups/export"} quiet>Download CSV</ButtonLink>}
      />

      <FilterBar action="/admin/signups">
        <div className="min-w-[14rem] flex-1">
          <label htmlFor="signup-q" className={`${MICRO_CLASS} block text-stone`}>
            Search
          </label>
          <input
            id="signup-q"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Email or name"
            className="w-full border-0 border-b border-ink/40 bg-transparent px-0 py-2 text-[0.9375rem] text-ink placeholder:text-stone focus:border-ink focus:outline-none"
          />
        </div>
        <div className="min-w-[10rem]">
          <SelectField name="status" label="Status" options={STATUS_OPTIONS} defaultValue={filters.status} blank="All" />
        </div>
        <div className="min-w-[10rem]">
          <SelectField name="destination" label="Destination" options={DESTINATION_OPTIONS} defaultValue={filters.destination} blank="All" />
        </div>
        <div className="min-w-[10rem]">
          <SelectField name="converted" label="Family" options={CONVERTED_OPTIONS} defaultValue={filters.converted} blank="All" />
        </div>
        {filtered ? (
          <Link href="/admin/signups" className={LINK_CLASS}>
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Section
        title={filtered ? "Matching signups" : "All signups"}
        description={`${total} ${total === 1 ? "signup" : "signups"}${pages > 1 ? ` · page ${page} of ${pages}` : ""}`}
      >
        {rows.length === 0 ? (
          <Empty>{filtered ? "No signups match those filters." : "No signups yet."}</Empty>
        ) : (
          <Table
            columns={["Joined", "Email", "Name", "Children's ages", "Destinations", "Source", "Status", "Family"]}
            rows={rows.map((s) => [
              <span key="j" className="whitespace-nowrap">
                {formatDateTime(s.createdAt)}
              </span>,
              <Link key="e" href={`/admin/signups/${s.id}`} className={`${LINK_CLASS} break-all`}>
                {s.email}
              </Link>,
              s.name ?? "—",
              s.childrenAges ?? "—",
              s.destinations?.length ? s.destinations.map((d) => JOURNEY_LABELS[d] ?? humanize(d)).join(", ") : "—",
              s.source ?? "—",
              <Badge key="s" tone={s.status === "confirmed" ? "strong" : s.status === "unsubscribed" ? "muted" : "plain"}>
                {humanize(s.status)}
              </Badge>,
              s.familyId ? (
                <Link key="f" href={`/admin/families/${s.familyId}`} className={LINK_CLASS}>
                  View family
                </Link>
              ) : (
                "—"
              ),
            ])}
          />
        )}
        {pages > 1 ? (
          <nav aria-label="Pages" className="mt-6 flex items-center gap-6">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={LINK_CLASS}>
                ← Previous
              </Link>
            ) : (
              <span className="text-stone">← Previous</span>
            )}
            <span className="text-[0.875rem] text-stone tabular-nums">
              {page} / {pages}
            </span>
            {page < pages ? (
              <Link href={pageHref(page + 1)} className={LINK_CLASS}>
                Next →
              </Link>
            ) : (
              <span className="text-stone">Next →</span>
            )}
          </nav>
        ) : null}
      </Section>
    </>
  )
}
