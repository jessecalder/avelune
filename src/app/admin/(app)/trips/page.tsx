import { and, asc, eq, sql, type SQL } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { ActionForm, Disclosure, SelectField } from "@/components/admin/fields"
import { Badge, Empty, FilterBar, LINK_CLASS, PageHeader, Section, Table } from "@/components/admin/kit"
import { getDb } from "@/db/client"
import { departureStatus, departures, journey } from "@/db/schema"
import { createDeparture } from "@/lib/admin/actions/trips"
import { requireAdmin } from "@/lib/admin/auth"
import { JOURNEY_LABELS, formatDateTime, formatRange, humanize } from "@/lib/admin/format"
import { DEPARTURE_STATUS_OPTIONS, DepartureFields, JOURNEY_OPTIONS } from "./DepartureFields"

export const metadata: Metadata = { title: "Trips" }

const CAP = 200

type Params = Promise<{ status?: string | string[]; journey?: string | string[] }>

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ""
}

export default async function TripsPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin()
  const sp = await searchParams
  const status = departureStatus.enumValues.find((v) => v === first(sp.status))
  const journeyFilter = journey.enumValues.find((v) => v === first(sp.journey))

  const conditions: (SQL | undefined)[] = []
  if (status) conditions.push(eq(departures.status, status))
  if (journeyFilter) conditions.push(eq(departures.journey, journeyFilter))

  const rows = await getDb()
    .select({
      id: departures.id,
      code: departures.code,
      name: departures.name,
      journey: departures.journey,
      startsOn: departures.startsOn,
      endsOn: departures.endsOn,
      status: departures.status,
      minFamilies: departures.minFamilies,
      maxFamilies: departures.maxFamilies,
      guaranteedAt: departures.guaranteedAt,
      // Qualified by hand: in a single-table select Drizzle prints a bare "id", which would bind to the subquery.
      families: sql<number>`(select count(*)::int from bookings b where b.departure_id = "departures"."id" and b.status in ('held', 'confirmed'))`,
    })
    .from(departures)
    .where(and(...conditions))
    .orderBy(asc(departures.startsOn), asc(departures.code))
    .limit(CAP + 1)

  const capped = rows.length > CAP
  const shown = capped ? rows.slice(0, CAP) : rows
  const filtered = Boolean(status || journeyFilter)

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Trips"
        description="Each dated run of a journey: who is booked, what the suppliers cost and what has been paid."
      />

      <div className="mt-8">
        <Disclosure summary="Add a departure">
          <ActionForm action={createDeparture} submitLabel="Add departure">
            <DepartureFields />
          </ActionForm>
        </Disclosure>
      </div>

      <FilterBar action="/admin/trips">
        <div className="min-w-[10rem]">
          <SelectField name="status" label="Status" options={DEPARTURE_STATUS_OPTIONS} defaultValue={status} blank="All" />
        </div>
        <div className="min-w-[10rem]">
          <SelectField name="journey" label="Journey" options={JOURNEY_OPTIONS} defaultValue={journeyFilter} blank="All" />
        </div>
        {filtered ? (
          <Link href="/admin/trips" className={LINK_CLASS}>
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Section title={filtered ? "Matching departures" : "All departures"} description="Families counts held and confirmed bookings.">
        {shown.length === 0 ? (
          <Empty>{filtered ? "No departures match those filters." : "No departures yet. Add the first one above."}</Empty>
        ) : (
          <Table
            columns={["Code", "Departure", "Journey", "Dates", "Status", "Families", "Guaranteed"]}
            rows={shown.map((d) => [
              <span key="c" className="whitespace-nowrap">
                {d.code}
              </span>,
              <Link key="n" href={`/admin/trips/${d.id}`} className={LINK_CLASS}>
                {d.name}
              </Link>,
              JOURNEY_LABELS[d.journey] ?? d.journey,
              formatRange(d.startsOn, d.endsOn),
              <Badge key="s" tone={d.status === "open" ? "strong" : d.status === "cancelled" || d.status === "completed" ? "muted" : "plain"}>
                {humanize(d.status)}
              </Badge>,
              <span key="f" className="whitespace-nowrap tabular-nums">
                {d.families} / {d.maxFamilies} <span className="text-stone">min {d.minFamilies}</span>
              </span>,
              d.guaranteedAt ? formatDateTime(d.guaranteedAt) : "—",
            ])}
          />
        )}
        {capped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the first {CAP} departures. Filter to see others.</p> : null}
      </Section>
    </>
  )
}
