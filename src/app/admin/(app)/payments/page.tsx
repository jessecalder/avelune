import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { SelectField } from "@/components/admin/fields"
import { Badge, Empty, FilterBar, LINK_CLASS, PageHeader, Section, Stat, Table } from "@/components/admin/kit"
import { getDb } from "@/db/client"
import { bookings, families, payments } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { formatDateTime, formatDay, formatMoney, humanize } from "@/lib/admin/format"
import { linkState, paymentTitle } from "@/lib/payments/state"
import { LinkStateBadge } from "./LinkStateBadge"
import { currentMs, loadCurrentLinks } from "./links"
import { OVERDUE, STATS_CURRENCY, loadPaymentStats } from "./stats"
import { lastActivity, tallyNote } from "./summary"

export const metadata: Metadata = { title: "Payments" }

const CAP = 200

const SHOW = ["outstanding", "overdue", "paid", "all"] as const
type Show = (typeof SHOW)[number]

const SHOW_OPTIONS: { value: Show; label: string }[] = [
  { value: "outstanding", label: "Outstanding" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
  { value: "all", label: "All" },
]

const SECTION_TITLE: Record<Show, string> = {
  outstanding: "Outstanding payments",
  overdue: "Overdue payments",
  paid: "Paid payments",
  all: "All payments",
}

const EMPTY: Record<Show, string> = {
  outstanding: "Nothing is outstanding. Request a payment from a booking's page.",
  overdue: "Nothing is overdue.",
  paid: "No payments have been paid yet.",
  all: "No payments yet. Request one from a booking's page.",
}

const STATUS_TONE = { paid: "strong", scheduled: "plain", invoiced: "plain", refunded: "muted", waived: "muted", cancelled: "muted" } as const

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ""
}

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()
  const sp = await searchParams
  const show: Show = SHOW.find((v) => v === first(sp.show)) ?? "outstanding"

  const waiting = inArray(payments.status, ["scheduled", "invoiced"])
  const conditions: SQL[] =
    show === "outstanding"
      ? [waiting]
      : show === "overdue"
        ? [OVERDUE]
        : show === "paid"
          ? [eq(payments.status, "paid")]
          : []
  // Soonest due first for what is owed, so anything overdue sits on top; newest first otherwise.
  const order =
    show === "outstanding" || show === "overdue"
      ? [asc(payments.dueOn), asc(payments.createdAt)]
      : show === "paid"
        ? [desc(payments.paidAt), desc(payments.createdAt)]
        : [desc(payments.dueOn), desc(payments.createdAt)]

  const db = getDb()
  const [stats, fetched] = await Promise.all([
    loadPaymentStats(),
    db
      .select({
        id: payments.id,
        kind: payments.kind,
        label: payments.label,
        status: payments.status,
        amountCents: payments.amountCents,
        currency: payments.currency,
        dueOn: payments.dueOn,
        paidAt: payments.paidAt,
        overdue: sql<boolean>`${OVERDUE}`,
        bookingId: bookings.id,
        bookingRef: bookings.ref,
        bookingStatus: bookings.status,
        familyId: families.id,
        familyName: families.familyName,
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .innerJoin(families, eq(families.id, bookings.familyId))
      .where(and(...conditions))
      .orderBy(...order)
      .limit(CAP + 1),
  ])
  const capped = fetched.length > CAP
  const rows = capped ? fetched.slice(0, CAP) : fetched
  // One query for every row's link.
  const links = await loadCurrentLinks(rows.map((r) => r.id))
  const nowMs = currentMs()

  return (
    <>
      <PageHeader
        eyebrow="Money in"
        title="Payments"
        description="Every payment asked of a family, and where each one stands. Request a payment from the booking's page."
      />

      <div className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-4">
        <Stat
          label="Outstanding"
          value={<span className="text-[1.5rem]">{formatMoney(stats.outstanding.cents, STATS_CURRENCY)}</span>}
          note={tallyNote(stats.outstanding)}
        />
        <Stat
          label="Overdue"
          value={<span className="text-[1.5rem]">{formatMoney(stats.overdue.cents, STATS_CURRENCY)}</span>}
          note={tallyNote(stats.overdue)}
        />
        <Stat
          label="Sent, not opened"
          value={<span className="text-[1.5rem] tabular-nums">{stats.sentNotOpened}</span>}
          note="Emailed links nobody has opened yet"
        />
        <Stat
          label="Paid, last 30 days"
          value={<span className="text-[1.5rem]">{formatMoney(stats.paidLast30Days.cents, STATS_CURRENCY)}</span>}
          note={`${tallyNote(stats.paidLast30Days)}, net of refunds`}
        />
      </div>
      <p className="mt-4 text-[0.8125rem] text-stone">
        Sums are in {STATS_CURRENCY.toUpperCase()}. Outstanding means scheduled or invoiced; overdue means past its due date (Pacific)
        with no bank payment clearing.
      </p>

      <FilterBar action="/admin/payments">
        <div className="min-w-[10rem]">
          <SelectField name="show" label="Show" options={SHOW_OPTIONS} defaultValue={show} />
        </div>
        {show !== "outstanding" ? (
          <Link href="/admin/payments" className={LINK_CLASS}>
            Clear
          </Link>
        ) : null}
      </FilterBar>

      <Section title={SECTION_TITLE[show]}>
        {rows.length === 0 ? (
          <Empty>{EMPTY[show]}</Empty>
        ) : (
          <Table
            columns={["Due", "Family", "Booking", "Payment", "Amount", "Status", "Link", "Last activity"]}
            rows={rows.map((r) => {
              const link = links.get(r.id)
              return [
                <span key="d" className="whitespace-nowrap">
                  {formatDay(r.dueOn)}
                </span>,
                <Link key="f" href={`/admin/families/${r.familyId}`} className={LINK_CLASS}>
                  {r.familyName}
                </Link>,
                <Link key="b" href={`/admin/bookings/${r.bookingId}`} className={LINK_CLASS}>
                  {r.bookingRef}
                </Link>,
                <Link key="p" href={`/admin/payments/${r.id}`} className={LINK_CLASS}>
                  {paymentTitle(r.kind, r.label)}
                </Link>,
                <span key="a" className="whitespace-nowrap tabular-nums">
                  {formatMoney(r.amountCents, r.currency)}
                </span>,
                <span key="s" className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[r.status]}>{humanize(r.status)}</Badge>
                  {r.overdue ? <Badge tone="strong">Overdue</Badge> : null}
                </span>,
                <LinkStateBadge key="l" state={linkState(link ?? null, r, nowMs, r.bookingStatus)} />,
                <span key="x" className="whitespace-nowrap">
                  {formatDateTime(lastActivity(link, r.paidAt))}
                </span>,
              ]
            })}
          />
        )}
        {capped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the first {CAP} payments. Filter to see others.</p> : null}
      </Section>
    </>
  )
}
