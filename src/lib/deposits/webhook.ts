import type Stripe from "stripe"
import type * as Store from "./store"

export type WebhookDeps = {
  store: Pick<
    typeof Store,
    "markPaid" | "markRefunded" | "markExpired" | "recordEvent" | "forgetEvent"
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

export async function handleStripeEvent(
  event: Stripe.Event,
  deps: WebhookDeps,
): Promise<WebhookResult> {
  const { store } = deps
  if (
    event.type !== "checkout.session.completed" &&
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
      case "checkout.session.expired": {
        await store.markExpired(event.data.object.id)
        return { handled: true }
      }
      case "charge.refunded": {
        const charge = event.data.object
        // Partial refunds also fire this event; only a full refund releases the place.
        if (!charge.refunded) return { handled: false, reason: "partial-refund" }
        const paymentIntentId = idOf(charge.payment_intent)
        if (!paymentIntentId) return { handled: false, reason: "no-payment-intent" }
        const meta = charge.metadata?.reservationId
        const outcome = await store.markRefunded({
          paymentIntentId,
          reservationId: meta && UUID.test(meta) ? meta : null,
        })
        if (outcome === "missing") throw new Error(`no reservation for payment ${paymentIntentId}`)
        return outcome === "updated" ? { handled: true } : { handled: false, reason: "stale" }
      }
    }
  } catch (err) {
    // Un-record so Stripe's retry is processed instead of skipped as a duplicate.
    await store.forgetEvent(event.id).catch(() => {})
    throw err
  }
}
