import type Stripe from "stripe"
import type * as Fulfil from "../payments/fulfil"
import type * as Store from "./store"

export type WebhookDeps = {
  store: Pick<
    typeof Store,
    "markPaid" | "markRefunded" | "markExpired" | "recordEvent" | "forgetEvent"
  >
  /** Payment links: events whose session or charge carries a payments.id in its metadata. */
  payments: Pick<
    typeof Fulfil,
    "fulfilCheckoutSession" | "failAsyncPayment" | "applyRefund" | "sessionExpired"
  >
  now: () => Date
  holdDays: number
}

export type WebhookResult = { handled: boolean; reason?: string }

const DAY_MS = 24 * 60 * 60 * 1000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function idOf(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null
  return typeof ref === "string" ? ref : ref.id
}

/** Sessions and charges made for a payment link carry the payments.id; deposit reservations do not. */
function isPaymentLink(metadata: Stripe.Metadata | null | undefined): boolean {
  return typeof metadata?.payment_id === "string" && metadata.payment_id !== ""
}

export async function handleStripeEvent(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookResult> {
  const { store, payments } = deps
  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded" &&
    event.type !== "checkout.session.async_payment_failed" &&
    event.type !== "checkout.session.expired" &&
    event.type !== "charge.refunded"
  ) {
    return { handled: false, reason: "ignored" }
  }

  if (!(await store.recordEvent(event.id, event.type))) {
    return { handled: false, reason: "duplicate" }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        if (isPaymentLink(session.metadata)) return await recordPaymentLinkSession(session, payments)
        if (session.payment_status !== "paid") {
          return { handled: false, reason: "not-paid" }
        }
        const outcome = await store.markPaid({
          sessionId: session.id,
          paymentIntentId: idOf(session.payment_intent),
          customerId: idOf(session.customer),
          holdExpiresAt: new Date(deps.now().getTime() + deps.holdDays * DAY_MS),
        })
        // Throwing un-records the event so Stripe's retry gets another go at it.
        if (outcome === "missing") throw new Error(`no reservation for session ${session.id}`)
        return outcome === "updated" ? { handled: true } : { handled: false, reason: "stale" }
      }
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object
        if (!isPaymentLink(session.metadata)) return { handled: false, reason: "not-ours" }
        return await recordPaymentLinkSession(session, payments)
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object
        if (!isPaymentLink(session.metadata)) return { handled: false, reason: "not-ours" }
        const outcome = await payments.failAsyncPayment(session)
        return outcome === "updated" ? { handled: true } : { handled: false, reason: outcome }
      }
      case "checkout.session.expired": {
        const session = event.data.object
        if (isPaymentLink(session.metadata)) {
          await payments.sessionExpired(session)
          return { handled: true }
        }
        await store.markExpired(session.id)
        return { handled: true }
      }
      case "charge.refunded": {
        const charge = event.data.object
        const meta = charge.metadata?.reservationId
        if (meta) {
          // Partial refunds also fire this event; only a full refund releases the place.
          if (!charge.refunded) return { handled: false, reason: "partial-refund" }
          const paymentIntentId = idOf(charge.payment_intent)
          if (!paymentIntentId) return { handled: false, reason: "no-payment-intent" }
          const outcome = await store.markRefunded({
            paymentIntentId,
            reservationId: UUID.test(meta) ? meta : null,
          })
          if (outcome === "missing") throw new Error(`no reservation for payment ${paymentIntentId}`)
          return outcome === "updated" ? { handled: true } : { handled: false, reason: "stale" }
        }
        const outcome = await payments.applyRefund(charge)
        // The payment is here but its completion is not recorded yet: a refund can outrun it, so retry rather than lose it.
        if (outcome === "pending") throw new Error(`payment ${charge.metadata?.payment_id} has no record of charge ${charge.id} yet`)
        // Nothing here knows the charge: another environment on the same Stripe account, or a deleted payment.
        if (outcome === "missing") return { handled: false, reason: "unknown-charge" }
        return outcome === "updated" ? { handled: true } : { handled: false, reason: outcome }
      }
    }
  } catch (err) {
    // Un-record so Stripe's retry is processed instead of skipped as a duplicate.
    await store.forgetEvent(event.id).catch(() => {})
    throw err
  }
}

/**
 * A completed (or later cleared) session for a payment link. A missing payment is not an error: it
 * may belong to another environment on the same test account. In live mode nothing else shares the
 * account, so live money that lands on no record is logged for the owner to find.
 */
async function recordPaymentLinkSession(
  session: Stripe.Checkout.Session,
  payments: WebhookDeps["payments"],
): Promise<WebhookResult> {
  const outcome = await payments.fulfilCheckoutSession(session)
  if (outcome === "missing" && session.livemode) {
    console.error(
      `[payments] live checkout session ${session.id} (${session.payment_status}) matches no payment or booking here; check it in Stripe.`,
    )
  }
  return outcome === "paid" || outcome === "processing" || outcome === "extra"
    ? { handled: true }
    : { handled: false, reason: outcome }
}
