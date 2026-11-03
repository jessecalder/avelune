import type { ReactNode } from "react"
import { and, asc, count, desc, eq, gte, inArray, isNotNull, isNull, lte, notInArray, sql } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { Badge, Empty, LINK_CLASS, Stat as MoneyStat, Table } from "@/components/admin/kit"
import { Micro, NUMERAL } from "@/components/maison/primitives"
import { getDb } from "@/db/client"
import {
  bookings,
  departureServices,
  departures,
  families,
  interactions,
  payments,
  reservations,
  signups,
  vendors,
} from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { JOURNEY_LABELS, formatDay, formatMoney, formatRange, humanize } from "@/lib/admin/format"
import { CLEARING, STATS_CURRENCY, loadPaymentStats } from "./payments/stats"
import { tallyNote } from "./payments/summary"

export const metadata: Metadata = { title: "Overview" }

const DAY_MS = 24 * 60 * 60 * 1000

const pacific = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatPacific(d: Date): string {
  return `${pacific.format(d)} PT`
}

const OPS_CAP = 50

/** Today's calendar date in Pacific time, "YYYY-MM-DD". */
function pacificToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date())
}

/** Adds whole days to a "YYYY-MM-DD" calendar date. */
function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
}

async function loadOperations(today: string) {
  const db = getDb()
  const [departureRows, followUps, paymentsDue, suppliersDue] = await Promise.all([
    db
      .select({
        id: departures.id,
        name: departures.name,
        journey: departures.journey,
        startsOn: departures.startsOn,
        endsOn: departures.endsOn,
        status: departures.status,
        minFamilies: departures.minFamilies,
        maxFamilies: departures.maxFamilies,
        guaranteedAt: departures.guaranteedAt,
        booked: sql<number>`(select count(*)::int from bookings b where b.departure_id = "departures"."id" and b.status in ('held', 'confirmed'))`,
      })
      .from(departures)
      .where(notInArray(departures.status, ["completed", "cancelled"]))
      .orderBy(asc(departures.startsOn))
      .limit(OPS_CAP),
    db
      .select({
        id: interactions.id,
        summary: interactions.summary,
        followUpOn: interactions.followUpOn,
        familyId: interactions.familyId,
        familyName: families.familyName,
        vendorId: interactions.vendorId,
        vendorName: vendors.name,
        departureId: interactions.departureId,
        departureName: departures.name,
      })
      .from(interactions)
      .leftJoin(families, eq(families.id, interactions.familyId))
      .leftJoin(vendors, eq(vendors.id, interactions.vendorId))
      .leftJoin(departures, eq(departures.id, interactions.departureId))
      .where(and(isNotNull(interactions.followUpOn), isNull(interactions.followUpDoneAt), lte(interactions.followUpOn, addDays(today, 7))))
      .orderBy(asc(interactions.followUpOn), asc(interactions.createdAt))
      .limit(OPS_CAP),
    db
      .select({
        id: payments.id,
        bookingId: payments.bookingId,
        bookingRef: bookings.ref,
        familyId: families.id,
        familyName: families.familyName,
        kind: payments.kind,
        label: payments.label,
        status: payments.status,
        amountCents: payments.amountCents,
        currency: payments.currency,
        dueOn: payments.dueOn,
        // A bank payment clearing through a payment link: paid, just slow, so never shown as overdue.
        clearing: sql<boolean>`${CLEARING}`,
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .innerJoin(families, eq(families.id, bookings.familyId))
      .where(and(inArray(payments.status, ["scheduled", "invoiced"]), lte(payments.dueOn, addDays(today, 30))))
      .orderBy(asc(payments.dueOn), asc(payments.createdAt))
      .limit(OPS_CAP),
    db
      .select({
        id: departureServices.id,
        departureId: departureServices.departureId,
        departureName: departures.name,
        vendorId: departureServices.vendorId,
        vendorName: vendors.name,
        title: departureServices.title,
        totalCents: departureServices.totalCents,
        paidCents: departureServices.paidCents,
        currency: departureServices.currency,
        balanceDueOn: departureServices.balanceDueOn,
      })
      .from(departureServices)
      .innerJoin(departures, eq(departures.id, departureServices.departureId))
      .leftJoin(vendors, eq(vendors.id, departureServices.vendorId))
      .where(
        and(
          inArray(departureServices.status, ["held", "confirmed"]),
          lte(departureServices.balanceDueOn, addDays(today, 30)),
          // Nothing left to pay once paid covers the total; an unpriced line stays listed.
          sql`(${departureServices.totalCents} is null or ${departureServices.paidCents} < ${departureServices.totalCents})`,
        ),
      )
      .orderBy(asc(departureServices.balanceDueOn), asc(departureServices.title))
      .limit(OPS_CAP),
  ])
  return { departureRows, followUps, paymentsDue, suppliersDue }
}

async function loadOverview(today: string) {
  const db = getDb()
  const since = new Date(Date.now() - 7 * DAY_MS)
  const [[total], [recent], byDestination, byStatus, latest, ops, paymentStats] = await Promise.all([
    db.select({ n: count() }).from(signups),
    db.select({ n: count() }).from(signups).where(gte(signups.createdAt, since)),
    db.execute<{ destination: string; n: number }>(
      sql`select d as destination, count(*)::int as n from ${signups}, unnest(${signups.destinations}) as d group by d order by n desc, d`,
    ),
    db.select({ status: reservations.status, n: count() }).from(reservations).groupBy(reservations.status),
    db
      .select({ createdAt: signups.createdAt, email: signups.email, name: signups.name, source: signups.source })
      .from(signups)
      .orderBy(desc(signups.createdAt))
      .limit(10),
    loadOperations(today),
    loadPaymentStats(),
  ])
  return {
    ops,
    paymentStats,
    total: total?.n ?? 0,
    recent: recent?.n ?? 0,
    byDestination: Array.from(byDestination),
    byStatus,
    latest,
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-t border-ink/40 pt-4">
      <Micro>{label}</Micro>
      <p className={`${NUMERAL} mt-3 text-[clamp(2.25rem,4vw,3.5rem)] text-ink`}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-16">
      <Micro tone="ink" className="mb-5">
        {title}
      </Micro>
      {children}
    </section>
  )
}

function Counts({ rows, empty }: { rows: { label: string; n: number }[]; empty: string }) {
  if (rows.length === 0) return <p className="font-sans text-[1.0625rem] text-stone">{empty}</p>
  return (
    <dl className="max-w-md border-t border-mist">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between border-b border-mist py-3">
          <dt className="font-sans text-[1.0625rem] text-ink-soft">{r.label}</dt>
          <dd className="font-sans text-[1.0625rem] tabular-nums text-ink">{r.n}</dd>
        </div>
      ))}
    </dl>
  )
}

export default async function AdminOverviewPage() {
  await requireAdmin()
  const today = pacificToday()

  let data: Awaited<ReturnType<typeof loadOverview>> | null = null
  let failed = false
  if (process.env.DATABASE_URL) {
    try {
      data = await loadOverview(today)
    } catch (err) {
      console.error("admin overview query failed", err instanceof Error ? err.message : err)
      failed = true
    }
  }

  return (
    <>
      <h1 className="display text-[clamp(2.25rem,4.5vw,4rem)] text-ink">Overview</h1>

      {!process.env.DATABASE_URL ? (
        <p className="mt-10 font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">
          No database configured (local file store in use).
        </p>
      ) : failed || !data ? (
        <p role="alert" className="mt-10 font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">
          The database could not be read. Check the server log.
        </p>
      ) : (
        <>
          <div className="mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-10">
            <Stat label="Signups" value={data.total} />
            <Stat label="Last 7 days" value={data.recent} />
          </div>

          <Section title="Departures">
            <Table
              empty="No departures yet."
              columns={["Departure", "Dates", "Status", "Families booked", "Guaranteed"]}
              rows={data.ops.departureRows.map((d) => [
                <span key="n">
                  <Link href={`/admin/trips/${d.id}`} className={LINK_CLASS}>
                    {d.name}
                  </Link>
                  <span className="block text-[0.8125rem] text-stone">{JOURNEY_LABELS[d.journey] ?? d.journey}</span>
                </span>,
                <span key="d" className="whitespace-nowrap">
                  {formatRange(d.startsOn, d.endsOn)}
                </span>,
                <Badge key="s" tone={d.status === "cancelled" || d.status === "completed" ? "muted" : "plain"}>
                  {humanize(d.status)}
                </Badge>,
                <span key="b" className="whitespace-nowrap tabular-nums">
                  {d.booked} <span className="text-stone">of {d.minFamilies}–{d.maxFamilies}</span>
                </span>,
                d.guaranteedAt ? <Badge key="g" tone="strong">Guaranteed</Badge> : <span key="g" className="text-stone">Not yet</span>,
              ])}
            />
          </Section>

          <Section title="Follow-ups due">
            <p className="mb-4 text-[0.875rem] text-stone">Open follow-ups due in the next 7 days, and anything overdue.</p>
            {data.ops.followUps.length === 0 ? (
              <Empty>Nothing to follow up this week.</Empty>
            ) : (
              <Table
                columns={["Due", "About", "Note"]}
                rows={data.ops.followUps.map((f) => {
                  const subject = f.familyId
                    ? { href: `/admin/families/${f.familyId}`, label: f.familyName }
                    : f.vendorId
                      ? { href: `/admin/vendors/${f.vendorId}`, label: f.vendorName }
                      : f.departureId
                        ? { href: `/admin/trips/${f.departureId}`, label: f.departureName }
                        : null
                  return [
                    <span key="d" className="flex flex-col items-start gap-1">
                      <span className="whitespace-nowrap">{formatDay(f.followUpOn)}</span>
                      {f.followUpOn && f.followUpOn < today ? <Badge tone="strong">Overdue</Badge> : null}
                    </span>,
                    subject ? (
                      <Link key="a" href={subject.href} className={LINK_CLASS}>
                        {subject.label ?? "Open record"}
                      </Link>
                    ) : (
                      "—"
                    ),
                    <span key="n" className="line-clamp-2 max-w-[48ch]">
                      {f.summary}
                    </span>,
                  ]
                })}
              />
            )}
          </Section>

          <Section title="Payments">
            <div className="grid max-w-2xl grid-cols-2 gap-x-8 gap-y-8">
              <MoneyStat
                label="Outstanding"
                value={<span className="text-[1.5rem]">{formatMoney(data.paymentStats.outstanding.cents, STATS_CURRENCY)}</span>}
                note={tallyNote(data.paymentStats.outstanding)}
              />
              <MoneyStat
                label="Overdue"
                value={<span className="text-[1.5rem]">{formatMoney(data.paymentStats.overdue.cents, STATS_CURRENCY)}</span>}
                note={tallyNote(data.paymentStats.overdue)}
              />
            </div>
            <p className="mt-5 text-[0.875rem] text-stone">
              Scheduled or invoiced family payments, in {STATS_CURRENCY.toUpperCase()}.{" "}
              <Link href="/admin/payments" className={LINK_CLASS}>
                All payments
              </Link>
            </p>
          </Section>

          <Section title="Payments due in the next 30 days">
            <p className="mb-4 text-[0.875rem] text-stone">Scheduled or invoiced family payments, with anything overdue first.</p>
            {data.ops.paymentsDue.length === 0 ? (
              <Empty>No family payments due in the next 30 days.</Empty>
            ) : (
              <Table
                columns={["Due", "Booking", "Family", "Payment", "Amount"]}
                rows={data.ops.paymentsDue.map((p) => [
                  <span key="d" className="flex flex-col items-start gap-1">
                    <span className="whitespace-nowrap">{formatDay(p.dueOn)}</span>
                    {p.dueOn < today && !p.clearing ? <Badge tone="strong">Overdue</Badge> : null}
                  </span>,
                  <Link key="b" href={`/admin/bookings/${p.bookingId}`} className={LINK_CLASS}>
                    {p.bookingRef}
                  </Link>,
                  <Link key="f" href={`/admin/families/${p.familyId}`} className={LINK_CLASS}>
                    {p.familyName}
                  </Link>,
                  `${p.label ?? humanize(p.kind)} · ${humanize(p.status)}`,
                  <span key="a" className="whitespace-nowrap tabular-nums">
                    {formatMoney(p.amountCents, p.currency)}
                  </span>,
                ])}
              />
            )}
          </Section>

          <Section title="Supplier balances due in the next 30 days">
            <p className="mb-4 text-[0.875rem] text-stone">Held or confirmed supplier lines that are not yet fully paid.</p>
            {data.ops.suppliersDue.length === 0 ? (
              <Empty>No supplier balances due in the next 30 days.</Empty>
            ) : (
              <Table
                columns={["Due", "Departure", "Vendor", "Line", "Total", "Paid"]}
                rows={data.ops.suppliersDue.map((l) => [
                  <span key="d" className="flex flex-col items-start gap-1">
                    <span className="whitespace-nowrap">{formatDay(l.balanceDueOn)}</span>
                    {l.balanceDueOn && l.balanceDueOn < today ? <Badge tone="strong">Overdue</Badge> : null}
                  </span>,
                  <Link key="p" href={`/admin/trips/${l.departureId}`} className={LINK_CLASS}>
                    {l.departureName}
                  </Link>,
                  l.vendorId ? (
                    <Link key="v" href={`/admin/vendors/${l.vendorId}`} className={LINK_CLASS}>
                      {l.vendorName}
                    </Link>
                  ) : (
                    "—"
                  ),
                  l.title,
                  <span key="t" className="whitespace-nowrap tabular-nums">
                    {formatMoney(l.totalCents, l.currency)}
                  </span>,
                  <span key="x" className="whitespace-nowrap tabular-nums">
                    {formatMoney(l.paidCents, l.currency)}
                  </span>,
                ])}
              />
            )}
          </Section>

          <Section title="Interest by destination">
            <Counts
              rows={data.byDestination.map((r) => ({ label: r.destination, n: r.n }))}
              empty="No destination interest recorded yet."
            />
          </Section>

          <Section title="Deposit reservations">
            <Counts
              rows={data.byStatus.map((r) => ({ label: r.status, n: r.n }))}
              empty="No reservations yet."
            />
          </Section>

          <Section title="Latest signups">
            {data.latest.length === 0 ? (
              <p className="font-sans text-[1.0625rem] text-stone">No signups yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-t border-mist text-left font-sans text-[0.9375rem]">
                  <thead>
                    <tr className="border-b border-mist">
                      {["When (Pacific)", "Email", "Name", "Source"].map((h) => (
                        <th key={h} scope="col" className="py-3 pr-6 text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-stone">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.latest.map((r) => (
                      <tr key={`${r.email}-${r.createdAt.toISOString()}`} className="border-b border-mist align-top">
                        <td className="whitespace-nowrap py-3 pr-6 text-ink-soft">{formatPacific(r.createdAt)}</td>
                        <td className="py-3 pr-6 break-all text-ink">{r.email}</td>
                        <td className="py-3 pr-6 text-ink-soft">{r.name ?? ""}</td>
                        <td className="py-3 pr-6 text-ink-soft">{r.source ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </>
  )
}
