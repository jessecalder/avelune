import { eq, sql } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CopyField } from "@/components/admin/CopyButton"
import { ActionButton, ActionForm, DateField, Disclosure } from "@/components/admin/fields"
import { BUTTON_QUIET_CLASS, Badge, Empty, Facts, LINK_CLASS, Notice, PageHeader, Section, Table } from "@/components/admin/kit"
import { PaymentEmailComposer } from "@/components/admin/PaymentEmailComposer"
import { getDb } from "@/db/client"
import { bookings, departures, families, payments, type Booking, type Payment, type PaymentLink } from "@/db/schema"
import { cancelPaymentLink, createPaymentLink } from "@/lib/admin/actions/payment-links"
import { requireAdmin } from "@/lib/admin/auth"
import { formatDateTime, formatDay, formatMoney, humanize } from "@/lib/admin/format"
import { isUuid } from "@/lib/admin/forms"
import { stripePaymentUrl } from "@/lib/admin/stripe-links"
import { paymentLinksConfigured, payUrl, stripeTestMode } from "@/lib/payments/config"
import { paymentEmailDraft } from "@/lib/payments/email"
import { linkState, paymentTitle } from "@/lib/payments/state"
import { listLinks } from "@/lib/payments/store"
import { emailSendingConfigured } from "@/lib/signups/email"
import { PaymentFields } from "../../bookings/PaymentFields"
import { LinkStateBadge } from "../LinkStateBadge"
import { currentMs } from "../links"
import { OVERDUE } from "../stats"
import { EditPaymentForm } from "./EditPaymentForm"

export const metadata: Metadata = { title: "Payment" }

const STATUS_TONE = { paid: "strong", scheduled: "plain", invoiced: "plain", refunded: "muted", waived: "muted", cancelled: "muted" } as const

/** The address of a link, or null when the public site address isn't set. */
function linkUrl(token: string): string | null {
  try {
    return payUrl(token)
  } catch {
    return null
  }
}

/** The link as the admin's preview opens it: the page does not count the visit as the family opening it. */
function previewUrl(url: string): string {
  return `${url}?preview=1`
}

/** Why a payment can't take a link (null when it can). */
function closedReason(payment: Payment["status"], booking: Booking["status"]): string | null {
  if (payment === "paid") return "This payment is paid, so there is nothing left to collect."
  if (payment === "refunded") return "This payment was refunded, so it can't take a new link."
  if (payment === "cancelled" || payment === "waived") {
    return `This payment is ${payment}. Change its status under “Edit payment” to send a link again.`
  }
  if (booking === "cancelled") return "This booking is cancelled, so the family can't pay through a link."
  return null
}

type Moment = { label: string; detail?: string; at: Date }

/** What has happened on this payment, oldest first. Only things that have a time are listed. */
function timeline(payment: Payment, link: PaymentLink | null, expired: boolean): Moment[] {
  const moments: Moment[] = []
  if (link) {
    moments.push({ label: "Link created", at: link.createdAt })
    if (link.emailSentAt) {
      const times = `${link.emailSendCount} ${link.emailSendCount === 1 ? "time" : "times"}`
      moments.push({ label: "Emailed", detail: `${times}, last to ${link.emailSentTo ?? "an address that wasn't recorded"}`, at: link.emailSentAt })
    }
    if (link.firstOpenedAt) moments.push({ label: "First opened", at: link.firstOpenedAt })
    if (link.lastOpenedAt && link.openCount > 1) {
      moments.push({ label: `Opened ${link.openCount} times`, detail: "last open", at: link.lastOpenedAt })
    }
    if (link.checkoutStartedAt) moments.push({ label: "Went to checkout", at: link.checkoutStartedAt })
    if (link.processingSince) moments.push({ label: "Bank payment clearing since", at: link.processingSince })
    if (link.lastFailedAt) moments.push({ label: "A bank payment failed", at: link.lastFailedAt })
    if (link.cancelledAt) moments.push({ label: "Link cancelled", at: link.cancelledAt })
    if (link.expiresAt) moments.push({ label: expired ? "Link expired" : "Link expires", at: link.expiresAt })
  }
  if ((payment.status === "paid" || payment.status === "refunded") && payment.paidAt) {
    moments.push({ label: "Paid", detail: formatMoney(payment.amountCents, payment.currency), at: payment.paidAt })
  }
  if (payment.refundedAt) {
    moments.push({
      label: payment.status === "refunded" ? "Refunded" : "Partly refunded",
      detail: formatMoney(payment.amountRefundedCents, payment.currency),
      at: payment.refundedAt,
    })
  }
  return moments.sort((a, b) => a.at.getTime() - b.at.getTime())
}

export default async function PaymentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!isUuid(id)) notFound()

  // "Today" (Pacific) comes from the database inside OVERDUE, so the render never reads the clock for it.
  const [[row], links] = await Promise.all([
    getDb()
      .select({
        payment: payments,
        overdue: sql<boolean>`${OVERDUE}`,
        booking: { id: bookings.id, ref: bookings.ref, status: bookings.status, currency: bookings.currency },
        family: {
          id: families.id,
          familyName: families.familyName,
          primaryContactName: families.primaryContactName,
          email: families.email,
        },
        departure: { id: departures.id, name: departures.name, startsOn: departures.startsOn, endsOn: departures.endsOn },
      })
      .from(payments)
      .innerJoin(bookings, eq(bookings.id, payments.bookingId))
      .innerJoin(families, eq(families.id, bookings.familyId))
      .innerJoin(departures, eq(departures.id, bookings.departureId))
      .where(eq(payments.id, id))
      .limit(1),
    listLinks(id),
  ])
  if (!row) notFound()
  const { payment, overdue, booking, family, departure } = row

  // Newest first, and a live link is always the newest: the rest are cancelled or replaced.
  const current = links[0] ?? null
  const active = current && !current.cancelledAt ? current : null
  const earlier = links.slice(1)
  const url = active ? linkUrl(active.token) : null

  const state = linkState(current, payment, currentMs(), booking.status)
  const expired = state === "expired"
  const closed = closedReason(payment.status, booking.status)
  const collectable = closed === null
  const canEmail = collectable && active !== null && url !== null && !expired && state !== "processing"

  const title = `${paymentTitle(payment.kind, payment.label)} · ${formatMoney(payment.amountCents, payment.currency)}`
  const expiryNote = active?.expiresAt ? `Works until ${formatDateTime(active.expiresAt)}.` : "No expiry."
  const draft =
    canEmail && url
      ? paymentEmailDraft({
          familyName: family.familyName,
          primaryContactName: family.primaryContactName,
          departureName: departure.name,
          startsOn: departure.startsOn,
          endsOn: departure.endsOn,
          bookingRef: booking.ref,
          kind: payment.kind,
          label: payment.label,
          amountCents: payment.amountCents,
          currency: payment.currency,
          dueOn: payment.dueOn,
          url,
        })
      : null

  const moments = timeline(payment, current, expired)
  const configured = paymentLinksConfigured()
  const testMode = stripeTestMode()

  return (
    <>
      <PageHeader
        back={{ href: `/admin/bookings/${booking.id}`, label: booking.ref }}
        eyebrow={`${booking.ref} · ${family.familyName}`}
        title={title}
        description={
          <>
            <Link href={`/admin/families/${family.id}`} className={LINK_CLASS}>
              {family.familyName}
            </Link>{" "}
            on{" "}
            <Link href={`/admin/trips/${departure.id}`} className={LINK_CLASS}>
              {departure.name}
            </Link>
          </>
        }
        actions={
          <>
            <LinkStateBadge state={state} />
            {payment.stripePaymentIntentId ? (
              <a href={stripePaymentUrl(payment.stripePaymentIntentId)} target="_blank" rel="noopener noreferrer" className={BUTTON_QUIET_CLASS}>
                Open in Stripe
              </a>
            ) : null}
          </>
        }
      />

      {!configured || testMode ? (
        <div className="mt-8 max-w-[70ch] space-y-3">
          {configured ? null : (
            <Notice>
              Stripe payment links aren&apos;t set up on this server (it needs STRIPE_SECRET_KEY, DATABASE_URL and NEXT_PUBLIC_SITE_URL). The
              link page will say online payment isn&apos;t available, so don&apos;t send links yet.
            </Notice>
          )}
          {testMode ? <Notice>Stripe is in test mode: test cards only, and no real money moves.</Notice> : null}
        </div>
      ) : null}

      <Section title="Status" description="Where this payment stands, and what the family has done with the link.">
        <Facts
          items={[
            { label: "Amount", value: <span className="tabular-nums">{formatMoney(payment.amountCents, payment.currency)}</span> },
            {
              label: "Due",
              value: (
                <span className="flex flex-wrap items-center gap-2">
                  {formatDay(payment.dueOn)}
                  {overdue ? <Badge tone="strong">Overdue</Badge> : null}
                </span>
              ),
            },
            { label: "Payment status", value: <Badge tone={STATUS_TONE[payment.status]}>{humanize(payment.status)}</Badge> },
            { label: "Method", value: humanize(payment.method) },
            { label: "Paid at", value: formatDateTime(payment.paidAt) },
            {
              label: "Refunded",
              value:
                payment.amountRefundedCents > 0 ? (
                  <>
                    <span className="tabular-nums">{formatMoney(payment.amountRefundedCents, payment.currency)}</span>
                    <span className="block text-stone">{formatDateTime(payment.refundedAt)}</span>
                  </>
                ) : (
                  "—"
                ),
            },
            { label: "Notes", value: payment.notes ? <span className="whitespace-pre-line">{payment.notes}</span> : "—" },
          ]}
        />

        <div className="mt-8">
          {moments.length === 0 ? (
            <Empty>Nothing has happened yet. Create a link to get started.</Empty>
          ) : (
            <ul className="divide-y divide-mist border-y border-mist">
              {moments.map((m) => (
                <li key={`${m.label}-${m.at.getTime()}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
                  <span className="text-[0.9375rem] text-ink">
                    {m.label}
                    {m.detail ? <span className="text-stone"> · {m.detail}</span> : null}
                  </span>
                  <span className="whitespace-nowrap text-[0.875rem] tabular-nums text-stone">{formatDateTime(m.at)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[0.8125rem] text-stone">Opens can include email security scanners that check links.</p>
        </div>
      </Section>

      <Section
        title="Payment link"
        description="A private page the family opens to pay. Nothing on the public site links to it."
      >
        {active && !collectable ? (
          <div className="space-y-4">
            <p className="max-w-[70ch] text-[0.9375rem] text-ink-soft">{closed}</p>
            {url ? (
              <a href={previewUrl(url)} target="_blank" rel="noopener noreferrer" className={BUTTON_QUIET_CLASS}>
                Preview as the family
              </a>
            ) : null}
          </div>
        ) : active ? (
          <div className="space-y-6">
            {expired ? (
              <div className="max-w-[70ch]">
                <Notice>This link expired on {formatDateTime(active.expiresAt)}. The family sees &ldquo;no longer active&rdquo;. Replace it to send a working one.</Notice>
              </div>
            ) : null}
            {state === "processing" ? (
              <div className="max-w-[70ch]">
                <Notice>
                  A bank payment from the family has been clearing since {formatDateTime(active.processingSince)}. It takes a few business
                  days. Don&apos;t send the link again unless it fails.
                </Notice>
              </div>
            ) : null}
            {url ? (
              <>
                <div className="max-w-[48rem]">
                  <CopyField label="Link" value={url} copyLabel="Copy link" />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a href={previewUrl(url)} target="_blank" rel="noopener noreferrer" className={BUTTON_QUIET_CLASS}>
                    Preview as the family
                  </a>
                  <ActionButton
                    action={cancelPaymentLink}
                    hidden={{ link_id: active.id, payment_id: id }}
                    confirm="Cancel this link? The family will no longer be able to open it or pay with it."
                  >
                    Cancel link
                  </ActionButton>
                </div>
                <p className="text-[0.8125rem] text-stone">
                  {expiryNote} Looking at it as the admin isn&apos;t counted as an open.
                </p>
              </>
            ) : (
              <Notice>
                NEXT_PUBLIC_SITE_URL isn&apos;t set on this server, so the link&apos;s address can&apos;t be shown. Set it, then reload.
              </Notice>
            )}
            <Disclosure summary="Replace with a new link" open={expired}>
              <p className="mb-5 max-w-[70ch] text-[0.875rem] text-stone">
                Makes a fresh link and stops the current one working. Use it if the link went to the wrong place or has expired.
              </p>
              <ActionForm action={createPaymentLink} hidden={{ payment_id: id }} submitLabel="Replace link">
                <DateField
                  name="expires_on"
                  label="Link works until"
                  hint="Optional. Pacific time, through the end of that day. Blank means no expiry."
                />
              </ActionForm>
            </Disclosure>
          </div>
        ) : collectable ? (
          <>
            <p className="mb-5 max-w-[70ch] text-[0.9375rem] text-ink-soft">
              This payment has no live link. Create one, then email it to the family.
              {current?.cancelledAt ? " The earlier link was cancelled." : ""}
            </p>
            <ActionForm action={createPaymentLink} hidden={{ payment_id: id }} submitLabel="Create payment link">
              <DateField
                name="expires_on"
                label="Link works until"
                hint="Optional. Pacific time, through the end of that day. Blank means no expiry."
              />
            </ActionForm>
          </>
        ) : (
          <p className="max-w-[70ch] text-[0.9375rem] text-ink-soft">{closed}</p>
        )}
      </Section>

      {canEmail && active && url && draft ? (
        <Section title="Email the family" description="The address on file is filled in. Edit the message, then send it from here or from your own mail app.">
          <PaymentEmailComposer
            // A new draft (the amount, due date or label changed) replaces the boxes; edits survive everything else.
            key={`${active.id}|${draft.subject}|${draft.text}`}
            paymentId={id}
            linkId={active.id}
            url={url}
            defaultTo={family.email}
            defaultSubject={draft.subject}
            defaultText={draft.text}
            canSend={emailSendingConfigured()}
            fromLabel={process.env.EMAIL_FROM ?? ""}
          />
        </Section>
      ) : null}

      <Section title="Edit payment" description="The money record. Changing its amount, status or currency changes what the link shows the family.">
        <Disclosure summary="Edit payment details">
          <EditPaymentForm paymentId={id} bookingId={booking.id}>
            <PaymentFields p={payment} bookingCurrency={booking.currency} />
          </EditPaymentForm>
        </Disclosure>
      </Section>

      {earlier.length > 0 ? (
        <Section title="Earlier links" description="Cancelled or replaced. They no longer open a payment page.">
          <Table
            columns={["Created", "Cancelled", "Emailed", "Opened"]}
            rows={earlier.map((l) => [
              <span key="c" className="whitespace-nowrap">
                {formatDateTime(l.createdAt)}
              </span>,
              <span key="x" className="whitespace-nowrap">
                {formatDateTime(l.cancelledAt)}
              </span>,
              l.emailSentAt ? (
                <span key="e" className="whitespace-nowrap">
                  {l.emailSendCount}× · {formatDateTime(l.emailSentAt)}
                </span>
              ) : (
                "—"
              ),
              l.openCount > 0 ? (
                <span key="o" className="whitespace-nowrap">
                  {l.openCount}× · last {formatDateTime(l.lastOpenedAt)}
                </span>
              ) : (
                "—"
              ),
            ])}
          />
        </Section>
      ) : null}
    </>
  )
}
