import { and, asc, eq, notInArray, sql } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DocumentsPanel } from "@/components/admin/DocumentsPanel"
import { ActionButton, ActionForm, Disclosure, SelectField } from "@/components/admin/fields"
import { Badge, Empty, Facts, LINK_CLASS, Notice, PageHeader, Section, Stat, Table } from "@/components/admin/kit"
import { getDb } from "@/db/client"
import { ageBand, bookingTravellers, bookings, departures, families, payments, travellers } from "@/db/schema"
import { addBookingTravellers, removeBookingTraveller, updateBooking } from "@/lib/admin/actions/bookings"
import { addPayment, deletePayment, updatePayment } from "@/lib/admin/actions/payments"
import { requireAdmin } from "@/lib/admin/auth"
import { stripePaymentUrl } from "@/lib/admin/stripe-links"
import { AGE_BAND_LABELS, JOURNEY_LABELS, formatDateTime, formatDay, formatMoney, formatRange, humanize } from "@/lib/admin/format"
import { isUuid } from "@/lib/admin/forms"
import { BookingFields } from "../BookingFields"
import { PaymentFields } from "../PaymentFields"

export const metadata: Metadata = { title: "Booking" }

const AGE_BAND_OPTIONS = ageBand.enumValues.map((v) => ({ value: v, label: AGE_BAND_LABELS[v] ?? v }))


export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!isUuid(id)) notFound()

  const db = getDb()
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1)
  if (!booking) notFound()

  // "Today" is Pacific and comes from the database, so the render never reads the clock.
  const today = sql`(now() at time zone 'America/Los_Angeles')::date`
  const [[family], [departure], onBooking, candidates, paymentRows] = await Promise.all([
    db.select({ id: families.id, familyName: families.familyName, email: families.email }).from(families).where(eq(families.id, booking.familyId)).limit(1),
    db.select().from(departures).where(eq(departures.id, booking.departureId)).limit(1),
    db
      .select({
        id: bookingTravellers.id,
        bandOnTrip: bookingTravellers.ageBand,
        label: travellers.label,
        travellerBand: travellers.ageBand,
        firstName: travellers.firstName,
        lastName: travellers.lastName,
      })
      .from(bookingTravellers)
      .innerJoin(travellers, eq(travellers.id, bookingTravellers.travellerId))
      .where(eq(bookingTravellers.bookingId, id))
      .orderBy(asc(travellers.ageBand), asc(travellers.label)),
    db
      .select({ id: travellers.id, label: travellers.label, ageBand: travellers.ageBand })
      .from(travellers)
      .where(
        and(
          eq(travellers.familyId, booking.familyId),
          notInArray(travellers.id, db.select({ t: bookingTravellers.travellerId }).from(bookingTravellers).where(eq(bookingTravellers.bookingId, id))),
        ),
      )
      .orderBy(asc(travellers.ageBand), asc(travellers.label)),
    db
      .select({
        payment: payments,
        overdue: sql<boolean>`${payments.status} in ('scheduled', 'invoiced') and ${payments.dueOn} < ${today}`,
      })
      .from(payments)
      .where(eq(payments.bookingId, id))
      .orderBy(asc(payments.dueOn), asc(payments.createdAt)),
  ])
  if (!family || !departure) notFound()

  // Sums only cover payments in the booking's currency; others are listed but not added in.
  const sameCurrency = paymentRows.filter((r) => r.payment.currency === booking.currency)
  const otherCurrency = paymentRows.length - sameCurrency.length
  const scheduled = sameCurrency
    .filter((r) => r.payment.status === "scheduled" || r.payment.status === "invoiced")
    .reduce((sum, r) => sum + r.payment.amountCents, 0)
  const paidNet = sameCurrency
    .filter((r) => r.payment.status === "paid" || r.payment.status === "refunded")
    .reduce((sum, r) => sum + r.payment.amountCents - r.payment.amountRefundedCents, 0)
  const outstanding = booking.totalPriceCents === null ? null : booking.totalPriceCents - paidNet

  const pagePath = `/admin/bookings/${id}`
  const tripPath = `/admin/trips/${departure.id}`

  return (
    <>
      <PageHeader
        back={{ href: tripPath, label: departure.name }}
        eyebrow={humanize(booking.status)}
        title={booking.ref}
        description={
          <>
            <Link href={`/admin/families/${family.id}`} className={LINK_CLASS}>
              {family.familyName}
            </Link>{" "}
            on{" "}
            <Link href={tripPath} className={LINK_CLASS}>
              {departure.name}
            </Link>
          </>
        }
      />

      <section className="mt-10 space-y-6">
        <Facts
          items={[
            {
              label: "Family",
              value: (
                <Link href={`/admin/families/${family.id}`} className={LINK_CLASS}>
                  {family.familyName}
                </Link>
              ),
            },
            {
              label: "Departure",
              value: (
                <>
                  <Link href={tripPath} className={LINK_CLASS}>
                    {departure.code}
                  </Link>{" "}
                  · {JOURNEY_LABELS[departure.journey] ?? departure.journey}
                  <span className="block text-stone">{formatRange(departure.startsOn, departure.endsOn)}</span>
                </>
              ),
            },
            { label: "Status", value: humanize(booking.status) },
            { label: "Total price", value: formatMoney(booking.totalPriceCents, booking.currency) },
            { label: "Currency", value: booking.currency.toUpperCase() },
            { label: "Held until", value: formatDateTime(booking.heldUntil) },
            {
              label: "Terms",
              value: booking.termsVersion ? (
                <>
                  Version {booking.termsVersion}
                  <span className="block text-stone">Accepted {formatDateTime(booking.termsAcceptedAt)}</span>
                </>
              ) : (
                "—"
              ),
            },
            {
              label: "Privacy notice",
              value: booking.privacyVersion ? (
                <>
                  Version {booking.privacyVersion}
                  <span className="block text-stone">Accepted {formatDateTime(booking.privacyAcceptedAt)}</span>
                </>
              ) : (
                "—"
              ),
            },
            { label: "Confirmed", value: formatDateTime(booking.confirmedAt) },
            {
              label: "Cancelled",
              value: booking.cancelledAt ? (
                <>
                  {formatDateTime(booking.cancelledAt)}
                  {booking.cancellationReason ? <span className="block whitespace-pre-line text-stone">{booking.cancellationReason}</span> : null}
                </>
              ) : (
                "—"
              ),
            },
            {
              label: "Arrival",
              value:
                booking.arrivesAt || booking.arrivalDetails ? (
                  <>
                    {formatDateTime(booking.arrivesAt)}
                    {booking.arrivalDetails ? <span className="block text-stone">{booking.arrivalDetails}</span> : null}
                  </>
                ) : (
                  "—"
                ),
            },
            {
              label: "Departure (travel)",
              value:
                booking.departsAt || booking.departureDetails ? (
                  <>
                    {formatDateTime(booking.departsAt)}
                    {booking.departureDetails ? <span className="block text-stone">{booking.departureDetails}</span> : null}
                  </>
                ) : (
                  "—"
                ),
            },
            { label: "Notes", value: booking.notes ? <span className="whitespace-pre-line">{booking.notes}</span> : "—" },
          ]}
        />
        <Disclosure summary="Edit booking">
          <ActionForm action={updateBooking} hidden={{ id }} submitLabel="Save booking">
            <BookingFields b={booking} />
          </ActionForm>
        </Disclosure>
      </section>

      <Section title="Travellers" description="Who from the family is going, and the age band each joins on this departure.">
        <div className="mb-5">
          <Notice>
            Dates of birth, dietary needs, allergies, medical notes and children&apos;s names are not editable here yet. They unlock with the booking-stage privacy update. Until then, children appear by label only.
          </Notice>
        </div>
        <Table
          empty="No travellers on this booking yet."
          columns={["Traveller", "Age band on this trip", "Name", ""]}
          rows={onBooking.map((t) => [
            t.label,
            AGE_BAND_LABELS[t.bandOnTrip] ?? t.bandOnTrip,
            // Names appear for adults only; a child's names are gated and stay blank.
            t.travellerBand === "adult" ? ([t.firstName, t.lastName].filter(Boolean).join(" ") || "—") : "—",
            <ActionButton key="rm" action={removeBookingTraveller} hidden={{ id: t.id, booking_id: id }} confirm={`Remove ${t.label} from this booking?`}>
              Remove
            </ActionButton>,
          ])}
        />
        <div className="mt-6">
          <Disclosure summary="Add travellers">
            {candidates.length === 0 ? (
              <Empty>
                {onBooking.length > 0
                  ? "Everyone in this family is already on the booking."
                  : "This family has no travellers recorded yet. Add them on the family's page."}
              </Empty>
            ) : (
              <ActionForm action={addBookingTravellers} hidden={{ booking_id: id }} resetOnSave submitLabel="Add selected">
                <div className="sm:col-span-2">
                  <p className="mb-2 text-[0.8125rem] text-stone">Tick who is going and check the age band they join on this trip.</p>
                  {candidates.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-end gap-x-10 gap-y-2 border-t border-mist py-3">
                      <label className="flex min-w-[12rem] items-center gap-3 pb-2 text-[0.9375rem] text-ink">
                        <input type="checkbox" name="traveller_id" value={t.id} className="size-4 accent-ink" />
                        {t.label}
                      </label>
                      <div className="min-w-[14rem]">
                        <SelectField name={`age_band_${t.id}`} label="Age band on this trip" options={AGE_BAND_OPTIONS} defaultValue={t.ageBand} />
                      </div>
                    </div>
                  ))}
                </div>
              </ActionForm>
            )}
          </Disclosure>
        </div>
      </Section>

      <Section title="Payments" description="What the family owes and has paid. Overdue means scheduled or invoiced and past its due date.">
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-4">
          <Stat label="Total price" value={<span className="text-[1.5rem]">{formatMoney(booking.totalPriceCents, booking.currency)}</span>} />
          <Stat label="Scheduled" value={<span className="text-[1.5rem]">{formatMoney(scheduled, booking.currency)}</span>} note="Scheduled and invoiced" />
          <Stat label="Paid" value={<span className="text-[1.5rem]">{formatMoney(paidNet, booking.currency)}</span>} note="Net of refunds" />
          <Stat
            label="Outstanding"
            value={<span className="text-[1.5rem]">{formatMoney(outstanding, booking.currency)}</span>}
            note={outstanding === null ? "No total price yet" : "Total price minus paid"}
          />
        </div>
        {otherCurrency > 0 ? (
          <p className="mt-4 text-[0.8125rem] text-stone">
            {otherCurrency === 1 ? "One payment is" : `${otherCurrency} payments are`} in a currency other than {booking.currency.toUpperCase()}.{" "}
            {otherCurrency === 1 ? "It is" : "They are"} listed but not counted in the sums above.
          </p>
        ) : null}

        <div className="mt-8">
          <Table
            empty="No payments yet."
            columns={["Due", "Kind", "Label", "Amount", "Status", "Method", "Paid at", "Refunded", "Stripe"]}
            rows={paymentRows.map(({ payment: p, overdue }) => [
              <span key="d" className="whitespace-nowrap">
                {formatDay(p.dueOn)}
              </span>,
              humanize(p.kind),
              p.label ?? "—",
              <span key="a" className="whitespace-nowrap tabular-nums">
                {formatMoney(p.amountCents, p.currency)}
              </span>,
              <span key="s" className="flex flex-wrap items-center gap-2">
                <Badge tone={p.status === "paid" ? "strong" : p.status === "cancelled" || p.status === "waived" || p.status === "refunded" ? "muted" : "plain"}>
                  {humanize(p.status)}
                </Badge>
                {overdue ? <Badge tone="strong">Overdue</Badge> : null}
              </span>,
              humanize(p.method),
              <span key="pa" className="whitespace-nowrap">
                {formatDateTime(p.paidAt)}
              </span>,
              <span key="r" className="whitespace-nowrap tabular-nums">
                {p.amountRefundedCents > 0 ? formatMoney(p.amountRefundedCents, p.currency) : "—"}
              </span>,
              p.stripePaymentIntentId ? (
                <a key="st" href={stripePaymentUrl(p.stripePaymentIntentId)} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                  Open in Stripe
                </a>
              ) : (
                "—"
              ),
            ])}
          />
        </div>

        {paymentRows.length > 0 ? (
          <div className="mt-6">
            {paymentRows.map(({ payment: p }) => (
              <div key={p.id} className="flex flex-wrap items-start justify-between gap-x-6">
                <div className="min-w-0 flex-1 basis-[20rem]">
                  <Disclosure summary={`Edit ${p.label ?? humanize(p.kind)} · ${formatDay(p.dueOn)}`}>
                    <ActionForm action={updatePayment} hidden={{ id: p.id, booking_id: id }} submitLabel="Save payment">
                      <PaymentFields p={p} bookingCurrency={booking.currency} />
                    </ActionForm>
                  </Disclosure>
                </div>
                <div className="pt-3">
                  <ActionButton
                    action={deletePayment}
                    hidden={{ id: p.id, booking_id: id }}
                    confirm={`Delete this ${formatMoney(p.amountCents, p.currency)} payment? This cannot be undone.`}
                  >
                    Delete
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-6">
          <Disclosure summary="Add a payment">
            <ActionForm action={addPayment} hidden={{ booking_id: id }} resetOnSave submitLabel="Add payment">
              <PaymentFields bookingCurrency={booking.currency} />
            </ActionForm>
          </Disclosure>
        </div>
      </Section>

      <DocumentsPanel bookingId={id} path={pagePath} title="Booking documents" />
    </>
  )
}
