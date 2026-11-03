import { and, desc, eq, inArray, type SQL } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { ActionButton, ActionForm, SelectField } from "@/components/admin/fields"
import { Badge, Empty, FilterBar, LINK_CLASS, Notice, PageHeader, Section, Table } from "@/components/admin/kit"
import { getDb } from "@/db/client"
import { bookings, departures, families, journey, payments, reservationStatus, reservations } from "@/db/schema"
import { recordDepositOnBooking, syncRefundToBooking } from "@/lib/admin/actions/deposits"
import { requireAdmin } from "@/lib/admin/auth"
import { stripePaymentUrl } from "@/lib/admin/stripe-links"
import { JOURNEY_LABELS, formatDateTime, formatMoney, humanize } from "@/lib/admin/format"

export const metadata: Metadata = { title: "Deposits" }

const CAP = 200
const DAY_MS = 24 * 60 * 60 * 1000

const STATUS_OPTIONS = reservationStatus.enumValues.map((v) => ({ value: v, label: humanize(v) }))
const JOURNEY_OPTIONS = journey.enumValues.map((v) => ({ value: v, label: JOURNEY_LABELS[v] ?? v }))

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? ""
}

const STATUS_TONE = { paid: "strong", refunded: "plain", pending: "muted", expired: "muted", cancelled: "muted" } as const

export default async function DepositsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()
  const sp = await searchParams
  const status = reservationStatus.enumValues.find((v) => v === first(sp.status))
  const journeyFilter = journey.enumValues.find((v) => v === first(sp.journey))
  const filtered = Boolean(status || journeyFilter)

  const conditions: SQL[] = []
  if (status) conditions.push(eq(reservations.status, status))
  if (journeyFilter) conditions.push(eq(reservations.journey, journeyFilter))

  const now = new Date()

  const db = getDb()
  const fetched = await db
    .select({
      id: reservations.id,
      createdAt: reservations.createdAt,
      email: reservations.email,
      journey: reservations.journey,
      amountCents: reservations.amountCents,
      currency: reservations.currency,
      status: reservations.status,
      paidAt: reservations.paidAt,
      holdExpiresAt: reservations.holdExpiresAt,
      refundedAt: reservations.refundedAt,
      paymentIntentId: reservations.stripePaymentIntentId,
      familyId: families.id,
      familyName: families.familyName,
      paymentId: payments.id,
      paymentBookingId: payments.bookingId,
      paymentStatus: payments.status,
      bookingRef: bookings.ref,
    })
    .from(reservations)
    .leftJoin(families, eq(families.emailKey, reservations.emailKey))
    .leftJoin(payments, eq(payments.reservationId, reservations.id))
    .leftJoin(bookings, eq(bookings.id, payments.bookingId))
    .where(and(...conditions))
    .orderBy(desc(reservations.createdAt), desc(reservations.id))
    .limit(CAP + 1)
  const capped = fetched.length > CAP
  const rows = capped ? fetched.slice(0, CAP) : fetched

  // Refunded in Stripe, but the payment copied onto the booking still counts as money collected.
  const refundMismatch = rows.filter((r) => r.status === "refunded" && r.paymentId && r.paymentBookingId && r.paymentStatus !== "refunded")

  // Reservations that can still be copied onto a booking, and the bookings of their matched families.
  const recordable = rows.filter((r) => (r.status === "paid" || r.status === "refunded") && r.familyId && !r.paymentId)
  const familyIds = [...new Set(recordable.map((r) => r.familyId as string))]
  const candidateBookings =
    familyIds.length === 0
      ? []
      : await db
          .select({
            id: bookings.id,
            familyId: bookings.familyId,
            ref: bookings.ref,
            status: bookings.status,
            departureName: departures.name,
          })
          .from(bookings)
          .innerJoin(departures, eq(departures.id, bookings.departureId))
          .where(inArray(bookings.familyId, familyIds))
          .orderBy(desc(bookings.createdAt))

  return (
    <>
      <PageHeader
        eyebrow="Money in"
        title="Deposits"
        description="Founding-family deposits taken through Stripe Checkout."
      />

      <div className="mt-8 max-w-[70ch]">
        <Notice>
          Deposits are taken by Stripe Checkout. Refunds are issued in the Stripe dashboard, and the webhook records them on the
          reservation here. A deposit already recorded on a booking is not updated by the webhook: use &ldquo;Mark refunded on
          booking&rdquo; below when that happens. To track a deposit against a family&apos;s booking, record it on the booking.
        </Notice>
      </div>

      <FilterBar action="/admin/deposits">
        <div className="min-w-[10rem]">
          <SelectField name="status" label="Status" options={STATUS_OPTIONS} defaultValue={status} blank="All" />
        </div>
        <div className="min-w-[10rem]">
          <SelectField name="journey" label="Journey" options={JOURNEY_OPTIONS} defaultValue={journeyFilter} blank="All" />
        </div>
        {filtered ? (
          <Link href="/admin/deposits" className={LINK_CLASS}>
            Clear
          </Link>
        ) : null}
      </FilterBar>

      {refundMismatch.length > 0 ? (
        <Section
          title="Refund not on the booking"
          description="Refunded in Stripe, but the booking still counts the deposit as paid, so its Paid and Outstanding figures are off."
        >
          <div className="divide-y divide-mist border-y border-mist">
            {refundMismatch.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <p className="text-[0.9375rem] text-ink">
                  <Link href={`/admin/bookings/${r.paymentBookingId}`} className={LINK_CLASS}>
                    {r.bookingRef ?? "Booking"}
                  </Link>
                  <span className="text-stone">
                    {" "}
                    · {r.familyName ?? r.email} · {formatMoney(r.amountCents, r.currency)} · refunded {formatDateTime(r.refundedAt)}
                  </span>
                </p>
                <ActionButton action={syncRefundToBooking} hidden={{ reservation_id: r.id }} quiet={false}>
                  Mark refunded on booking
                </ActionButton>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {recordable.length > 0 ? (
        <Section
          title="Ready to record on a booking"
          description="Paid or refunded deposits from a known family that are not yet on a booking."
        >
          <div className="divide-y divide-mist border-y border-mist">
            {recordable.map((r) => {
              const options = candidateBookings
                .filter((b) => b.familyId === r.familyId)
                .map((b) => ({
                  value: b.id,
                  label: `${b.ref} · ${b.departureName}${b.status === "cancelled" ? " (cancelled)" : ""}`,
                }))
              return (
                <div key={r.id} className="py-5">
                  <p className="text-[0.9375rem] text-ink">
                    <Link href={`/admin/families/${r.familyId}`} className={LINK_CLASS}>
                      {r.familyName}
                    </Link>
                    <span className="text-stone">
                      {" "}
                      · {r.email} · {JOURNEY_LABELS[r.journey] ?? r.journey} · {formatMoney(r.amountCents, r.currency)} · {humanize(r.status)}
                    </span>
                  </p>
                  {options.length === 0 ? (
                    <p className="mt-2 text-[0.875rem] text-stone">This family has no bookings yet. Create the booking first, then record the deposit on it.</p>
                  ) : (
                    <ActionForm
                      action={recordDepositOnBooking}
                      submitLabel="Record on booking"
                      className="mt-3"
                      hidden={{ reservation_id: r.id }}
                    >
                      <SelectField name="booking_id" label="Booking" options={options} required blank="Choose a booking" />
                    </ActionForm>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      ) : null}

      <Section title={filtered ? "Matching reservations" : "All reservations"}>
        {rows.length === 0 ? (
          <Empty>{filtered ? "No reservations match those filters." : "No deposit reservations yet."}</Empty>
        ) : (
          <Table
            columns={["Created", "Email", "Journey", "Amount", "Status", "Paid", "Hold ends", "Refunded", "Stripe", "Family", "On a booking"]}
            rows={rows.map((r) => {
              const holdEnding =
                r.status === "paid" &&
                r.holdExpiresAt !== null &&
                r.holdExpiresAt.getTime() > now.getTime() &&
                r.holdExpiresAt.getTime() - now.getTime() <= 3 * DAY_MS
              return [
                <span key="c" className="whitespace-nowrap">
                  {formatDateTime(r.createdAt)}
                </span>,
                <span key="e" className="break-all">
                  {r.email}
                </span>,
                JOURNEY_LABELS[r.journey] ?? r.journey,
                <span key="a" className="whitespace-nowrap tabular-nums">
                  {formatMoney(r.amountCents, r.currency)}
                </span>,
                <Badge key="s" tone={STATUS_TONE[r.status]}>
                  {humanize(r.status)}
                </Badge>,
                <span key="p" className="whitespace-nowrap">
                  {formatDateTime(r.paidAt)}
                </span>,
                <span key="h" className="flex flex-col items-start gap-1">
                  <span className="whitespace-nowrap">{formatDateTime(r.holdExpiresAt)}</span>
                  {holdEnding ? <Badge>Hold ending</Badge> : null}
                </span>,
                <span key="r" className="whitespace-nowrap">
                  {formatDateTime(r.refundedAt)}
                </span>,
                r.paymentIntentId ? (
                  <a key="x" href={stripePaymentUrl(r.paymentIntentId)} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                    Stripe
                  </a>
                ) : (
                  "—"
                ),
                r.familyId ? (
                  <Link key="f" href={`/admin/families/${r.familyId}`} className={LINK_CLASS}>
                    {r.familyName}
                  </Link>
                ) : (
                  "No match"
                ),
                r.paymentId && r.paymentBookingId ? (
                  <span key="b" className="flex flex-col items-start gap-1">
                    <Link href={`/admin/bookings/${r.paymentBookingId}`} className={LINK_CLASS}>
                      {r.bookingRef ?? "Booking"}
                    </Link>
                    {r.status === "refunded" && r.paymentStatus !== "refunded" ? <Badge>Refund not on booking</Badge> : null}
                  </span>
                ) : (
                  "Not yet"
                ),
              ]
            })}
          />
        )}
        {capped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the newest {CAP} reservations. Filter to see others.</p> : null}
      </Section>
    </>
  )
}
