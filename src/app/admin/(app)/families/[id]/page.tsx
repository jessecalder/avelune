import { asc, desc, eq, notInArray, sql } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ActionButton, ActionForm, Disclosure, MoneyField, SelectField, TextField } from "@/components/admin/fields"
import { InteractionsPanel } from "@/components/admin/InteractionsPanel"
import { Badge, Empty, Facts, LINK_CLASS, Notice, PageHeader, Section, Table } from "@/components/admin/kit"
import { getDb } from "@/db/client"
import { bookings, departures, families, payments, travellers } from "@/db/schema"
import {
  addTraveller,
  createBooking,
  deleteFamily,
  removeTraveller,
  updateFamily,
  updateTraveller,
} from "@/lib/admin/actions/families"
import { requireAdmin } from "@/lib/admin/auth"
import { AGE_BAND_LABELS, formatDateTime, formatDay, formatMoney, formatRange, humanize } from "@/lib/admin/format"
import { isUuid } from "@/lib/admin/forms"
import { linkState, paymentTitle } from "@/lib/payments/state"
import { LinkStateBadge } from "../../payments/LinkStateBadge"
import { currentMs, loadCurrentLinks } from "../../payments/links"
import { OVERDUE } from "../../payments/stats"
import { FamilyFields, TravellerFields } from "../FamilyFields"

export const metadata: Metadata = { title: "Family" }

const CAP = 200

const BOOKING_STATUS_OPTIONS = [
  { value: "held", label: "Held" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "confirmed", label: "Confirmed" },
]

export default async function FamilyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!isUuid(id)) notFound()

  const db = getDb()
  const [family] = await db.select().from(families).where(eq(families.id, id)).limit(1)
  if (!family) notFound()

  const [people, bookingRows, openDepartures, paymentRows] = await Promise.all([
    db
      .select({
        traveller: travellers,
        // Qualified by hand: Drizzle prints a bare "id" in a single-table select, which would bind to the subquery.
        onBookings: sql<number>`(select count(*)::int from booking_travellers bt where bt.traveller_id = "travellers"."id")`,
      })
      .from(travellers)
      .where(eq(travellers.familyId, id))
      .orderBy(asc(travellers.createdAt), asc(travellers.label))
      .limit(CAP + 1),
    db
      .select({
        id: bookings.id,
        ref: bookings.ref,
        status: bookings.status,
        totalPriceCents: bookings.totalPriceCents,
        currency: bookings.currency,
        departureId: departures.id,
        departureCode: departures.code,
        departureName: departures.name,
        startsOn: departures.startsOn,
        endsOn: departures.endsOn,
        partySize: sql<number>`(select count(*)::int from booking_travellers bt where bt.booking_id = "bookings"."id")`,
      })
      .from(bookings)
      .innerJoin(departures, eq(departures.id, bookings.departureId))
      .where(eq(bookings.familyId, id))
      .orderBy(desc(departures.startsOn), desc(bookings.createdAt))
      .limit(CAP + 1),
    db
      .select({ id: departures.id, name: departures.name, startsOn: departures.startsOn, endsOn: departures.endsOn, currency: departures.currency })
      .from(departures)
      .where(notInArray(departures.status, ["cancelled", "completed"]))
      .orderBy(asc(departures.startsOn)),
    db
      .select({
        id: payments.id,
        kind: payments.kind,
        label: payments.label,
        status: payments.status,
        amountCents: payments.amountCents,
        currency: payments.currency,
        dueOn: payments.dueOn,
        overdue: sql<boolean>`${OVERDUE}`,
        bookingId: bookings.id,
        bookingRef: bookings.ref,
        bookingStatus: bookings.status,
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .where(eq(bookings.familyId, id))
      .orderBy(asc(payments.dueOn), asc(payments.createdAt))
      .limit(CAP + 1),
  ])

  const peopleCapped = people.length > CAP
  const shownPeople = peopleCapped ? people.slice(0, CAP) : people
  const bookingsCapped = bookingRows.length > CAP
  const shownBookings = bookingsCapped ? bookingRows.slice(0, CAP) : bookingRows
  const paymentsCapped = paymentRows.length > CAP
  const shownPayments = paymentsCapped ? paymentRows.slice(0, CAP) : paymentRows
  // One query for the link behind every payment.
  const links = await loadCurrentLinks(shownPayments.map((p) => p.id))
  const nowMs = currentMs()

  const departureOptions = openDepartures.map((d) => ({
    value: d.id,
    label: `${d.name} · ${formatRange(d.startsOn, d.endsOn)} · ${d.currency.toUpperCase()}`,
  }))

  return (
    <>
      <PageHeader
        back={{ href: "/admin/families", label: "Families" }}
        eyebrow={humanize(family.status)}
        title={family.familyName}
        actions={
          <ActionButton
            action={deleteFamily}
            hidden={{ id }}
            confirm={`Delete ${family.familyName}? Its people and conversation log are deleted with it. This cannot be undone.`}
          >
            Delete family
          </ActionButton>
        }
      />

      <section className="mt-10 space-y-6">
        <Facts
          items={[
            { label: "Primary contact", value: family.primaryContactName ?? "—" },
            {
              label: "Email",
              value: (
                <a href={`mailto:${family.email}`} className={LINK_CLASS}>
                  {family.email}
                </a>
              ),
            },
            { label: "Phone", value: family.phone ?? "—" },
            { label: "Home city", value: family.homeCity ?? "—" },
            { label: "Country", value: family.countryCode },
            { label: "Source", value: family.source ?? "—" },
            { label: "Stripe customer", value: family.stripeCustomerId ?? "—" },
            {
              label: "Early-access signup",
              value: family.signupId ? (
                <Link href={`/admin/signups/${family.signupId}`} className={LINK_CLASS}>
                  View signup
                </Link>
              ) : (
                "—"
              ),
            },
            { label: "Added", value: formatDateTime(family.createdAt) },
            { label: "Updated", value: formatDateTime(family.updatedAt) },
            { label: "Notes", value: family.notes ? <span className="whitespace-pre-line">{family.notes}</span> : "—" },
          ]}
        />
        <Disclosure summary="Edit family">
          <ActionForm action={updateFamily} hidden={{ id }} submitLabel="Save family">
            <FamilyFields f={family} />
          </ActionForm>
        </Disclosure>
      </section>

      <Section title="Travellers" description="Everyone in the household. Children are listed by label only.">
        <Table
          empty="No one listed yet."
          columns={["Label", "Age band", "Relationship", "Name", "Email / phone", "On bookings", <span key="a" className="sr-only">Actions</span>]}
          rows={shownPeople.map(({ traveller: t, onBookings }) => [
            t.label,
            AGE_BAND_LABELS[t.ageBand] ?? humanize(t.ageBand),
            t.relationship ?? "—",
            t.ageBand === "adult" ? ([t.firstName, t.lastName].filter(Boolean).join(" ") || "—") : "—",
            t.ageBand === "adult" ? ([t.email, t.phone].filter(Boolean).join(" · ") || "—") : "—",
            <span key="n" className="tabular-nums">
              {onBookings}
            </span>,
            <ActionButton
              key="r"
              action={removeTraveller}
              hidden={{ id: t.id, family_id: id }}
              confirm={`Remove ${t.label} from this family?`}
            >
              Remove
            </ActionButton>,
          ])}
        />
        {peopleCapped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the first {CAP} people.</p> : null}

        {shownPeople.length > 0 ? (
          <div className="mt-6">
            {shownPeople.map(({ traveller: t }) => (
              <Disclosure key={t.id} summary={`Edit ${t.label}`}>
                <ActionForm
                  action={updateTraveller}
                  hidden={{ id: t.id, family_id: id, ...(t.ageBand === "adult" ? { person_fields: "1" } : {}) }}
                  submitLabel="Save person"
                >
                  <TravellerFields t={t} withPerson={t.ageBand === "adult"} />
                </ActionForm>
              </Disclosure>
            ))}
          </div>
        ) : null}

        <div className={shownPeople.length > 0 ? "" : "mt-6"}>
          <Disclosure summary="Add a person">
            <ActionForm action={addTraveller} hidden={{ family_id: id }} resetOnSave submitLabel="Add person">
              <TravellerFields />
            </ActionForm>
          </Disclosure>
        </div>

        <div className="mt-6">
          <Notice>
            Dates of birth, dietary needs, allergies and medical notes unlock after the booking-stage privacy notice is published. Don&rsquo;t put them in notes.
          </Notice>
        </div>
      </Section>

      <Section title="Bookings" description="This family's places on departures.">
        <Table
          empty="No bookings yet."
          columns={["Ref", "Departure", "Dates", "Status", "Total", "Travellers"]}
          rows={shownBookings.map((b) => [
            <Link key="r" href={`/admin/bookings/${b.id}`} className={LINK_CLASS}>
              {b.ref}
            </Link>,
            <Link key="d" href={`/admin/trips/${b.departureId}`} className={LINK_CLASS}>
              {b.departureName}
            </Link>,
            <span key="dt" className="whitespace-nowrap">
              {formatRange(b.startsOn, b.endsOn)}
            </span>,
            <Badge key="s" tone={b.status === "confirmed" ? "strong" : b.status === "cancelled" || b.status === "completed" ? "muted" : "plain"}>
              {humanize(b.status)}
            </Badge>,
            <span key="t" className="tabular-nums">
              {formatMoney(b.totalPriceCents, b.currency)}
            </span>,
            <span key="p" className="tabular-nums">
              {b.partySize}
            </span>,
          ])}
        />
        {bookingsCapped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the latest {CAP} bookings.</p> : null}

        <div className="mt-6">
          <Disclosure summary="Add a booking">
            {departureOptions.length === 0 ? (
              <Empty>No departures are open for booking. Add or reopen a trip first.</Empty>
            ) : (
              <ActionForm action={createBooking} hidden={{ family_id: id }} submitLabel="Add booking">
                <SelectField name="departure_id" label="Departure" required options={departureOptions} blank="Choose" wide />
                <SelectField name="status" label="Status" options={BOOKING_STATUS_OPTIONS} defaultValue="held" />
                <MoneyField name="total_price" label="Total price" hint="Optional. Leave blank while only held." />
                <TextField name="currency" label="Currency" maxLength={3} placeholder="usd" hint="Three letters. Blank uses the departure's currency." />
              </ActionForm>
            )}
          </Disclosure>
        </div>
      </Section>

      <Section title="Payments" description="Everything asked of this family across their bookings. Open a payment to send or track its link.">
        <Table
          empty="No payments yet. Request one from a booking's page."
          columns={["Booking", "Payment", "Amount", "Due", "Status", "Link"]}
          rows={shownPayments.map((p) => [
            <Link key="b" href={`/admin/bookings/${p.bookingId}`} className={LINK_CLASS}>
              {p.bookingRef}
            </Link>,
            <Link key="p" href={`/admin/payments/${p.id}`} className={LINK_CLASS}>
              {paymentTitle(p.kind, p.label)}
            </Link>,
            <span key="a" className="whitespace-nowrap tabular-nums">
              {formatMoney(p.amountCents, p.currency)}
            </span>,
            <span key="d" className="whitespace-nowrap">
              {formatDay(p.dueOn)}
            </span>,
            <span key="s" className="flex flex-wrap items-center gap-2">
              <Badge tone={p.status === "paid" ? "strong" : p.status === "cancelled" || p.status === "waived" || p.status === "refunded" ? "muted" : "plain"}>
                {humanize(p.status)}
              </Badge>
              {p.overdue ? <Badge tone="strong">Overdue</Badge> : null}
            </span>,
            <LinkStateBadge key="l" state={linkState(links.get(p.id) ?? null, p, nowMs, p.bookingStatus)} />,
          ])}
        />
        {paymentsCapped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the first {CAP} payments.</p> : null}
      </Section>

      <InteractionsPanel familyId={family.id} title="Conversations" />
    </>
  )
}
