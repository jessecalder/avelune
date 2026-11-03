import { and, asc, count, eq, inArray, ne, sql } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DocumentsPanel } from "@/components/admin/DocumentsPanel"
import { InteractionsPanel } from "@/components/admin/InteractionsPanel"
import { ActionButton, ActionForm, Disclosure, MoneyField, SelectField, TextField } from "@/components/admin/fields"
import { Badge, Facts, LINK_CLASS, PageHeader, Section, Stat, Table } from "@/components/admin/kit"
import { getDb } from "@/db/client"
import { ageBand, bookingStatus, bookingTravellers, bookings, departureServices, departures, families, payments, vendors } from "@/db/schema"
import { createBooking } from "@/lib/admin/actions/bookings"
import { addService, deleteService, updateService } from "@/lib/admin/actions/services"
import { clearGuaranteed, deleteDeparture, markGuaranteed, updateDeparture } from "@/lib/admin/actions/trips"
import { requireAdmin } from "@/lib/admin/auth"
import { AGE_BAND_LABELS, JOURNEY_LABELS, formatDateTime, formatDay, formatMoney, formatRange, humanize } from "@/lib/admin/format"
import { isUuid } from "@/lib/admin/forms"
import { DepartureFields } from "../DepartureFields"
import { ServiceFields } from "./ServiceFields"

export const metadata: Metadata = { title: "Trip" }

const LIST_CAP = 200
const PICKER_CAP = 1000

/** Statuses that take a place on the departure. */
const ACTIVE = ["held", "confirmed"] as const
/** Statuses whose travellers count towards host headcounts. */
const HEADCOUNT = ["held", "confirmed", "completed"] as const

const NEW_BOOKING_STATUS_OPTIONS = bookingStatus.enumValues
  .filter((v) => v === "waitlisted" || v === "held" || v === "confirmed")
  .map((v) => ({ value: v, label: humanize(v) }))

function MoneyLines({ rows, fallbackCurrency }: { rows: { currency: string; total: number }[]; fallbackCurrency: string }) {
  const lines = rows.length > 0 ? rows : [{ currency: fallbackCurrency, total: 0 }]
  return (
    <span className="block text-[1.5rem] leading-tight">
      {lines.map((r) => (
        <span key={r.currency} className="block tabular-nums">
          {formatMoney(r.total, r.currency)}
        </span>
      ))}
    </span>
  )
}

export default async function TripPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ line?: string | string[] }>
}) {
  await requireAdmin()
  const { id } = await params
  if (!isUuid(id)) notFound()
  const { line: lineParam } = await searchParams
  const lineId = typeof lineParam === "string" && isUuid(lineParam) ? lineParam : null

  const db = getDb()
  const [departure] = await db.select().from(departures).where(eq(departures.id, id)).limit(1)
  if (!departure) notFound()

  const [
    [counts],
    [travellerTotal],
    revenue,
    collected,
    headcount,
    bookingRows,
    serviceRows,
    serviceTotals,
    vendorRows,
    familyRows,
  ] = await Promise.all([
    db
      .select({
        booked: sql<number>`count(*) filter (where ${bookings.status} in ('held', 'confirmed'))::int`,
        confirmed: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed')::int`,
      })
      .from(bookings)
      .where(eq(bookings.departureId, id)),
    db
      .select({ n: count() })
      .from(bookingTravellers)
      .innerJoin(bookings, eq(bookings.id, bookingTravellers.bookingId))
      .where(and(eq(bookings.departureId, id), ne(bookings.status, "cancelled"))),
    db
      .select({ currency: bookings.currency, total: sql<number>`coalesce(sum(${bookings.totalPriceCents}), 0)::double precision` })
      .from(bookings)
      .where(and(eq(bookings.departureId, id), inArray(bookings.status, [...ACTIVE])))
      .groupBy(bookings.currency)
      .orderBy(asc(bookings.currency)),
    // Cash received net of refunds, across every booking on the departure (a cancelled booking's deposit is still cash held).
    db
      .select({
        currency: payments.currency,
        total: sql<number>`coalesce(sum(${payments.amountCents} - ${payments.amountRefundedCents}), 0)::double precision`,
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .where(and(eq(bookings.departureId, id), inArray(payments.status, ["paid", "refunded"])))
      .groupBy(payments.currency)
      .orderBy(asc(payments.currency)),
    db
      .select({ band: bookingTravellers.ageBand, n: count() })
      .from(bookingTravellers)
      .innerJoin(bookings, eq(bookings.id, bookingTravellers.bookingId))
      .where(and(eq(bookings.departureId, id), inArray(bookings.status, [...HEADCOUNT])))
      .groupBy(bookingTravellers.ageBand),
    db
      .select({
        id: bookings.id,
        ref: bookings.ref,
        familyId: bookings.familyId,
        familyName: families.familyName,
        status: bookings.status,
        totalPriceCents: bookings.totalPriceCents,
        currency: bookings.currency,
        travellerCount: sql<number>`(select count(*)::int from booking_travellers bt where bt.booking_id = "bookings"."id")`,
        paidNet: sql<number>`(select coalesce(sum(p.amount_cents - p.amount_refunded_cents), 0)::int from payments p where p.booking_id = "bookings"."id" and p.status in ('paid', 'refunded') and p.currency = "bookings"."currency")`,
      })
      .from(bookings)
      .innerJoin(families, eq(families.id, bookings.familyId))
      .where(eq(bookings.departureId, id))
      .orderBy(asc(bookings.ref))
      .limit(LIST_CAP + 1),
    db
      .select({ service: departureServices, vendorName: vendors.name })
      .from(departureServices)
      .leftJoin(vendors, eq(vendors.id, departureServices.vendorId))
      .where(eq(departureServices.departureId, id))
      .orderBy(sql`${departureServices.startsOn} asc nulls last`, asc(departureServices.title))
      .limit(LIST_CAP + 1),
    // Declined and cancelled lines are not costs, so they stay out of the footer.
    db
      .select({
        currency: departureServices.currency,
        total: sql<number>`coalesce(sum(${departureServices.totalCents}), 0)::double precision`,
        paid: sql<number>`coalesce(sum(${departureServices.paidCents}), 0)::double precision`,
        usd: sql<number>`coalesce(sum(${departureServices.usdEstimateCents}), 0)::double precision`,
      })
      .from(departureServices)
      .where(and(eq(departureServices.departureId, id), sql`${departureServices.status} not in ('declined', 'cancelled')`))
      .groupBy(departureServices.currency)
      .orderBy(asc(departureServices.currency)),
    db
      .select({ id: vendors.id, name: vendors.name, category: vendors.category })
      .from(vendors)
      .orderBy(asc(vendors.name))
      .limit(PICKER_CAP),
    db
      .select({ id: families.id, familyName: families.familyName, email: families.email })
      .from(families)
      .orderBy(asc(families.familyName))
      .limit(PICKER_CAP + 1),
  ])

  const bookingsCapped = bookingRows.length > LIST_CAP
  const shownBookings = bookingsCapped ? bookingRows.slice(0, LIST_CAP) : bookingRows
  const selectedLine = lineId ? (serviceRows.find((r) => r.service.id === lineId)?.service ?? null) : null
  const servicesCapped = serviceRows.length > LIST_CAP
  const shownServices = servicesCapped ? serviceRows.slice(0, LIST_CAP) : serviceRows
  const familiesCapped = familyRows.length > PICKER_CAP
  const familyOptions = (familiesCapped ? familyRows.slice(0, PICKER_CAP) : familyRows).map((f) => ({ value: f.id, label: `${f.familyName} · ${f.email}` }))
  const vendorOptions = vendorRows.map((v) => ({ value: v.id, label: `${v.name} · ${humanize(v.category)}` }))

  const headcountByBand = new Map(headcount.map((h) => [h.band, h.n]))
  const headcountTotal = headcount.reduce((sum, h) => sum + h.n, 0)
  const usdEstimateTotal = serviceTotals.reduce((sum, t) => sum + t.usd, 0)
  const pagePath = `/admin/trips/${id}`

  return (
    <>
      <PageHeader
        back={{ href: "/admin/trips", label: "Trips" }}
        eyebrow={`${departure.code} · ${JOURNEY_LABELS[departure.journey] ?? departure.journey} · ${humanize(departure.status)}`}
        title={departure.name}
        actions={
          <>
            {departure.guaranteedAt ? (
              <ActionButton action={clearGuaranteed} hidden={{ id }} confirm="Clear the guarantee? The departure will show as not yet guaranteed.">
                Clear guarantee
              </ActionButton>
            ) : (
              <ActionButton
                action={markGuaranteed}
                hidden={{ id }}
                quiet={false}
                confirm="Record that this departure will run? Today's date is saved as the guarantee date."
              >
                Mark guaranteed
              </ActionButton>
            )}
            <ActionButton
              action={deleteDeparture}
              hidden={{ id }}
              confirm={`Delete ${departure.name}? Its notes and calls are deleted with it. This cannot be undone.`}
            >
              Delete departure
            </ActionButton>
          </>
        }
      />

      <section className="mt-10 grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-5">
        <Stat label="Families booked" value={`${counts?.booked ?? 0} / ${departure.maxFamilies}`} note={`Held and confirmed. Minimum ${departure.minFamilies}.`} />
        <Stat label="Confirmed" value={counts?.confirmed ?? 0} note="Families" />
        <Stat label="Travellers" value={travellerTotal?.n ?? 0} note="On bookings that are not cancelled" />
        <Stat label="Revenue booked" value={<MoneyLines rows={revenue} fallbackCurrency={departure.currency} />} note="Held and confirmed bookings" />
        <Stat label="Collected" value={<MoneyLines rows={collected} fallbackCurrency={departure.currency} />} note="Paid, net of refunds" />
      </section>

      <section className="mt-10 space-y-6">
        <Facts
          items={[
            { label: "Dates", value: formatRange(departure.startsOn, departure.endsOn) },
            { label: "Families", value: `Minimum ${departure.minFamilies}, maximum ${departure.maxFamilies}` },
            { label: "Guaranteed", value: departure.guaranteedAt ? formatDateTime(departure.guaranteedAt) : "Not yet" },
            { label: "Currency", value: departure.currency.toUpperCase() },
            { label: "Balance due", value: formatDay(departure.balanceDueOn) },
            { label: "Price note", value: departure.priceNote ? <span className="whitespace-pre-line">{departure.priceNote}</span> : "—" },
            { label: "Notes", value: departure.notes ? <span className="whitespace-pre-line">{departure.notes}</span> : "—" },
          ]}
        />
        <Disclosure summary="Edit departure">
          <ActionForm action={updateDeparture} hidden={{ id }} submitLabel="Save departure">
            <DepartureFields d={departure} />
          </ActionForm>
        </Disclosure>
      </section>

      <Section title="Headcount by age band" description="Travellers on held, confirmed and completed bookings. Sets how many hosts each tier needs.">
        <Table
          columns={["Age band", "Travellers"]}
          rows={[
            ...ageBand.enumValues.map((band) => [
              AGE_BAND_LABELS[band] ?? band,
              <span key={band} className="tabular-nums">
                {headcountByBand.get(band) ?? 0}
              </span>,
            ]),
            [
              <span key="l" className="font-medium">
                Total
              </span>,
              <span key="t" className="font-medium tabular-nums">
                {headcountTotal}
              </span>,
            ],
          ]}
        />
      </Section>

      <Section title="Bookings" description="Each family's place on this departure.">
        <Table
          empty="No bookings yet."
          columns={["Ref", "Family", "Status", "Travellers", "Total", "Paid (net)"]}
          rows={shownBookings.map((b) => [
            <Link key="r" href={`/admin/bookings/${b.id}`} className={LINK_CLASS}>
              {b.ref}
            </Link>,
            <Link key="f" href={`/admin/families/${b.familyId}`} className={LINK_CLASS}>
              {b.familyName}
            </Link>,
            <Badge key="s" tone={b.status === "confirmed" ? "strong" : b.status === "cancelled" ? "muted" : "plain"}>
              {humanize(b.status)}
            </Badge>,
            <span key="t" className="tabular-nums">
              {b.travellerCount}
            </span>,
            <span key="tot" className="tabular-nums">
              {formatMoney(b.totalPriceCents, b.currency)}
            </span>,
            <span key="p" className="tabular-nums">
              {formatMoney(b.paidNet, b.currency)}
            </span>,
          ])}
        />
        {bookingsCapped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the first {LIST_CAP} bookings.</p> : null}
        <div className="mt-6">
          <Disclosure summary="Add a booking">
            <ActionForm action={createBooking} hidden={{ departure_id: id }} submitLabel="Add booking">
              <SelectField
                name="family_id"
                label="Family"
                required
                options={familyOptions}
                blank="Choose a family"
                hint={familiesCapped ? `Showing the first ${PICKER_CAP} families by name.` : "A family can have one active booking per departure."}
              />
              <SelectField name="status" label="Status" options={NEW_BOOKING_STATUS_OPTIONS} defaultValue="held" />
              <MoneyField name="total_price" label="Total price" hint="Leave blank until a price is agreed." />
              <TextField name="currency" label="Currency" defaultValue={departure.currency} maxLength={3} placeholder="usd" />
            </ActionForm>
          </Disclosure>
        </div>
      </Section>

      <Section title="Supplier sheet" description="Everything this departure needs from suppliers, with rates, status and what has been paid.">
        <Table
          empty="No supplier lines yet."
          columns={["Dates", "Category", "Line", "Vendor", "Status", "Rate", "Total", "USD est.", "Paid", "Balance due"]}
          rows={shownServices.map(({ service: s, vendorName }) => [
            <span key="d" className="whitespace-nowrap">
              {formatRange(s.startsOn, s.endsOn)}
              {s.startTime ? <span className="block text-stone">{s.startTime.slice(0, 5)}</span> : null}
            </span>,
            humanize(s.category),
            <span key="t">
              {s.title}
              {s.ageBand ? <span className="block text-[0.8125rem] text-stone">{AGE_BAND_LABELS[s.ageBand] ?? s.ageBand}</span> : null}
            </span>,
            s.vendorId ? (
              <Link key="v" href={`/admin/vendors/${s.vendorId}`} className={LINK_CLASS}>
                {vendorName}
              </Link>
            ) : (
              "—"
            ),
            <Badge key="s" tone={s.status === "confirmed" ? "strong" : s.status === "declined" || s.status === "cancelled" ? "muted" : "plain"}>
              {humanize(s.status)}
            </Badge>,
            <span key="r" className="whitespace-nowrap tabular-nums">
              {formatMoney(s.unitRateCents, s.currency)} × {Number(s.quantity)}
              <span className="block text-[0.8125rem] text-stone">{humanize(s.rateUnit)}</span>
            </span>,
            <span key="tot" className="whitespace-nowrap tabular-nums">
              {formatMoney(s.totalCents, s.currency)}
            </span>,
            <span key="u" className="whitespace-nowrap tabular-nums">
              {formatMoney(s.usdEstimateCents, "usd")}
            </span>,
            <span key="p" className="whitespace-nowrap tabular-nums">
              {formatMoney(s.paidCents, s.currency)}
            </span>,
            formatDay(s.balanceDueOn),
          ])}
        />
        {servicesCapped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the first {LIST_CAP} lines. The totals below cover every line.</p> : null}

        {serviceTotals.length > 0 ? (
          <dl className="mt-6 grid gap-x-10 gap-y-3 border-t border-ink/40 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {serviceTotals.map((t) => (
              <div key={t.currency}>
                <dt className="text-[0.8125rem] uppercase tracking-[0.2em] text-stone">Total {t.currency.toUpperCase()}</dt>
                <dd className="mt-1 tabular-nums">
                  {formatMoney(t.total, t.currency)}
                  <span className="block text-[0.8125rem] text-stone">{formatMoney(t.paid, t.currency)} paid</span>
                </dd>
              </div>
            ))}
            <div>
              <dt className="text-[0.8125rem] uppercase tracking-[0.2em] text-stone">USD estimate</dt>
              <dd className="mt-1 tabular-nums">{formatMoney(usdEstimateTotal, "usd")}</dd>
            </div>
          </dl>
        ) : null}
        {serviceTotals.length > 0 ? <p className="mt-3 text-[0.8125rem] text-stone">Totals leave out declined and cancelled lines.</p> : null}

        {shownServices.length > 0 ? (
          <div className="mt-6">
            {shownServices.map(({ service: s }) => (
              <div key={s.id} className="flex flex-wrap items-start justify-between gap-x-6">
                <div className="min-w-0 flex-1 basis-[20rem]">
                  <Disclosure summary={`Edit ${s.title}`}>
                    <ActionForm action={updateService} hidden={{ id: s.id, departure_id: id }} submitLabel="Save line">
                      <ServiceFields s={s} vendorOptions={vendorOptions} departureCurrency={departure.currency} />
                    </ActionForm>
                  </Disclosure>
                </div>
                <div className="flex items-center gap-6 pt-3">
                  <Link href={`/admin/trips/${id}?line=${s.id}`} scroll={false} className={LINK_CLASS}>
                    Documents
                  </Link>
                  <ActionButton action={deleteService} hidden={{ id: s.id, departure_id: id }} confirm={`Delete the line "${s.title}"? This cannot be undone.`}>
                    Delete
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-6">
          <Disclosure summary="Add a line">
            <ActionForm action={addService} hidden={{ departure_id: id }} resetOnSave submitLabel="Add line">
              <ServiceFields vendorOptions={vendorOptions} departureCurrency={departure.currency} />
            </ActionForm>
          </Disclosure>
        </div>
      </Section>

      {selectedLine ? (
        <DocumentsPanel departureServiceId={selectedLine.id} path={pagePath} title={`Documents for ${selectedLine.title}`} />
      ) : null}
      <DocumentsPanel departureId={id} path={pagePath} title="Departure documents" />
      <InteractionsPanel departureId={id} path={pagePath} title="Notes and calls" />
    </>
  )
}
