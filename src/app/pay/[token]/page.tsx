import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { notFound } from "next/navigation"
import { after, connection } from "next/server"
import { Suspense } from "react"
import { PrivateShell } from "@/components/maison/PrivateShell"
import { site } from "@/content/site"
import { adminConfigured } from "@/lib/admin/auth"
import { formatMoney } from "@/lib/admin/format"
import { PAY_PREVIEW_COOKIE, verifySessionValue } from "@/lib/admin/session"
import { paymentLinksConfigured } from "@/lib/payments/config"
import { fulfilCheckoutSession } from "@/lib/payments/fulfil"
import { paymentTitle, paymentWord } from "@/lib/payments/state"
import { getPayViewByToken, recordOpen, type PayView } from "@/lib/payments/store"
import { isLinkToken } from "@/lib/payments/token"
import { getStripe } from "@/lib/stripe"
import { payDay, payPaidDay, payRange } from "../format"
import { isAutomatedAgent, linkIsLive, payPageState, type PayPageState } from "../page-state"
import { PayButton } from "./PayButton"
import { Amount, Band, Lead, Note, PAY_COLUMN_CLASS, PayFallback, Questions, Receipt, SmallPrint, type ReceiptRow } from "./parts"

type SearchParams = Promise<Record<string, string | string[] | undefined>>
type Props = { params: Promise<{ token: string }>; searchParams: SearchParams }

export const metadata: Metadata = {
  title: site.pay.metaTitle,
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
}

const SESSION_ID = /^cs_[A-Za-z0-9_]+$/

function first(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0]
}

type Settled = { outcome: "settled"; paid: boolean } | { outcome: "skipped" | "failed" }

/**
 * The family came back from Stripe. Record the session now instead of waiting for the webhook,
 * but only when Stripe says it belongs to this link: the query string alone proves nothing.
 * "failed" means we could not find out, so the page must not invite a second payment.
 * `paid`: Stripe says this link's session was paid, so the visitor is the payer.
 */
async function settleReturn(view: PayView, sessionId: string): Promise<Settled> {
  if (!paymentLinksConfigured()) return { outcome: "skipped" }
  // This very session is already on the payment: nothing to learn from Stripe.
  if (view.payment.status === "paid" && view.payment.stripeCheckoutSessionId === sessionId) return { outcome: "skipped" }
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    if (session.metadata?.payment_link_id !== view.link.id) return { outcome: "skipped" }
    await fulfilCheckoutSession(session)
    return { outcome: "settled", paid: session.status === "complete" && session.payment_status === "paid" }
  } catch (err) {
    // A session id Stripe has never heard of (another account, a stale bookmark) is not ours.
    if ((err as { code?: string }).code === "resource_missing") return { outcome: "skipped" }
    console.error("[payments] could not settle the checkout return:", err instanceof Error ? err.message : err)
    return { outcome: "failed" }
  }
}

type Loaded = {
  token: string
  query: Awaited<SearchParams>
  view: PayView
  state: PayPageState
  sessionId: string | null
  /** Back from Stripe but Stripe could not be asked: say so instead of inviting a second payment. */
  confirmationPending: boolean
  nowMs: number
}

/** Everything the page needs that comes from the request, the database and Stripe. */
async function load({ params, searchParams }: Props): Promise<Loaded> {
  // Everything here is per request: the link, the payment and Stripe's answer must be fresh.
  await connection()
  const { token } = await params
  if (!isLinkToken(token)) notFound()
  const query = await searchParams

  let view = await getPayViewByToken(token)
  if (!view) notFound()

  const rawSession = first(query.session_id)
  const sessionId = rawSession && SESSION_ID.test(rawSession) ? rawSession : null
  let confirmationPending = false
  let returnedPaid = false
  if (sessionId) {
    const settled = await settleReturn(view, sessionId)
    if (settled.outcome === "settled") {
      view = (await getPayViewByToken(token)) ?? view
      returnedPaid = settled.paid
    }
    confirmationPending = settled.outcome === "failed"
  }

  const nowMs = Date.now()
  const state = payPageState({ link: view.link, payment: view.payment, bookingStatus: view.booking.status, nowMs, returnedPaid })
  return { token, query, view, state, sessionId, confirmationPending, nowMs }
}

/**
 * The owner looking at a family's link: signed in (the /pay copy of the session cookie), or
 * arriving from the admin's "Preview as the family" (?preview=1). The flag only affects counting,
 * so trusting it costs nothing: a family that adds it only stops its own opens being counted.
 */
async function ownerViewing(query: Loaded["query"], nowMs: number): Promise<boolean> {
  if (first(query.preview) === "1") return true
  if (!adminConfigured()) return false
  return verifySessionValue((await cookies()).get(PAY_PREVIEW_COOKIE)?.value, nowMs)
}

/**
 * A view by the family counts as an open. Not the owner previewing, not a chat app unfurling the
 * link, and not the return from Stripe.
 */
async function trackOpen({ view, state, sessionId, nowMs, query }: Loaded) {
  if (sessionId || state === "inactive" || !linkIsLive(view.link, nowMs)) return
  if (await ownerViewing(query, nowMs)) return
  if (isAutomatedAgent((await headers()).get("user-agent"))) return
  const linkId = view.link.id
  after(async () => {
    try {
      await recordOpen(linkId)
    } catch (err) {
      console.error("[payments] could not record an open:", err instanceof Error ? err.message : err)
    }
  })
}

async function PayBody(props: Props) {
  const loaded = await load(props)
  await trackOpen(loaded)
  const { view, state, token, query, confirmationPending } = loaded
  const { payment, booking, family, departure } = view

  const copy = site.pay
  const money = formatMoney(payment.amountCents, payment.currency)
  const place = site.destinations.places.find((p) => p.id === departure.journey)
  const subtitle = place ? `${place.name}, ${place.country}` : departure.name
  const eyebrow = `${copy.eyebrow} · ${booking.ref}`

  // A closed link says as little as possible: no family, no booking, no amount.
  if (state === "inactive") {
    return (
      <>
        <Band journey={departure.journey} eyebrow={copy.eyebrow} title={copy.inactive.title} />
        <div className={`${PAY_COLUMN_CLASS} pb-20 pt-12 text-center sm:pb-28 sm:pt-16`}>
          <Lead>{copy.inactive.body}</Lead>
          <a
            href={`mailto:${site.contactEmail}`}
            className="inline-flex h-14 w-full items-center justify-center rounded-none border border-ink px-6 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-ink transition-colors hover:bg-ink hover:text-bone"
          >
            {copy.writeToUs}
          </a>
          <SmallPrint className="mt-6">{site.contactEmail}</SmallPrint>
        </div>
      </>
    )
  }

  const rows: ReceiptRow[] = [
    { label: copy.labels.preparedFor, value: family.familyName },
    { label: copy.labels.journey, value: departure.name },
    { label: copy.labels.dates, value: payRange(departure.startsOn, departure.endsOn) },
    { label: copy.labels.booking, value: booking.ref },
    { label: copy.labels.payment, value: paymentTitle(payment.kind, payment.label) },
  ]

  if (state === "payable") {
    rows.push({ label: copy.labels.due, value: payDay(payment.dueOn) })
    const configured = paymentLinksConfigured()
    return (
      <>
        <Band journey={departure.journey} eyebrow={eyebrow} title={copy.titles[payment.kind]} subtitle={subtitle} />
        <div className={`${PAY_COLUMN_CLASS} pb-16 pt-10 sm:pb-24 sm:pt-14`}>
          <Receipt rows={rows} />
          <Amount label={copy.labels.amount} text={money} />
          <div className="mt-8">
            {first(query.cancelled) === "1" && !confirmationPending ? (
              <div className="mb-5">
                <Note>{copy.cancelledNote}</Note>
              </div>
            ) : null}
            {confirmationPending ? (
              <Note>{copy.confirming}</Note>
            ) : configured ? (
              <PayButton token={token} label={copy.payButton(money)} pendingLabel={copy.pending} />
            ) : (
              <Note>{copy.unavailable}</Note>
            )}
            <div className="mt-8 space-y-2 text-center">
              {configured && !confirmationPending ? <SmallPrint>{copy.secure}</SmallPrint> : null}
              <SmallPrint>{copy.private}</SmallPrint>
              <Questions />
            </div>
          </div>
        </div>
      </>
    )
  }

  // The Stripe receipt line only for money that went through Stripe, not a transfer the owner recorded.
  const throughStripe = payment.method === "stripe" && !!payment.stripePaymentIntentId
  const body =
    state === "paid"
      ? [copy.paid.body(paymentWord(payment.kind, payment.label), money), throughStripe ? copy.paid.receipt : null]
          .filter(Boolean)
          .join(" ")
      : state === "processing"
        ? copy.processing.body
        : copy.refunded.body
  const title = copy[state].title
  if (state === "paid" && payment.paidAt) rows.push({ label: copy.labels.paidOn, value: payPaidDay(payment.paidAt) })
  if (state === "paid" && payment.amountRefundedCents > 0) {
    rows.push({ label: copy.labels.amountRefunded, value: formatMoney(payment.amountRefundedCents, payment.currency) })
  }
  const amount =
    state === "refunded"
      ? {
          label: copy.labels.amountRefunded,
          text: formatMoney(payment.amountRefundedCents > 0 ? payment.amountRefundedCents : payment.amountCents, payment.currency),
        }
      : { label: state === "paid" ? copy.labels.amountPaid : copy.labels.amount, text: money }

  return (
    <>
      <Band journey={departure.journey} eyebrow={eyebrow} title={title} subtitle={subtitle} />
      <div className={`${PAY_COLUMN_CLASS} pb-16 pt-12 sm:pb-24 sm:pt-16`}>
        <Lead>{body}</Lead>
        <Receipt rows={rows} />
        <Amount label={amount.label} text={amount.text} />
        <div className="mt-8 text-center">
          <Questions />
        </div>
      </div>
    </>
  )
}

// An unknown or malformed token gets its 404 status from src/proxy.ts: once this page starts
// streaming, notFound() can only render the not-found UI under a 200.
export default function PayPage(props: Props) {
  return (
    <PrivateShell>
      <Suspense fallback={<PayFallback />}>
        <PayBody params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </PrivateShell>
  )
}
