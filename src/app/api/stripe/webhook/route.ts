import { depositTerms } from "@/lib/deposits/config"
import * as store from "@/lib/deposits/store"
import { handleStripeEvent } from "@/lib/deposits/webhook"
import { getStripe } from "@/lib/stripe"

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !process.env.STRIPE_SECRET_KEY || !process.env.DATABASE_URL) {
    return Response.json({ error: "deposits not configured" }, { status: 503 })
  }

  // The signature covers the exact bytes Stripe sent, so read the raw text.
  const body = await req.text()
  const signature = req.headers.get("stripe-signature")
  if (!signature) {
    return Response.json({ error: "invalid signature" }, { status: 400 })
  }

  let event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret)
  } catch (err) {
    console.error("[deposits] webhook signature check failed:", err instanceof Error ? err.message : "unknown")
    return Response.json({ error: "invalid signature" }, { status: 400 })
  }

  try {
    const result = await handleStripeEvent(event, {
      store,
      now: () => new Date(),
      holdDays: depositTerms().holdDays,
    })
    return Response.json({ received: true, ...result })
  } catch (err) {
    // 500 makes Stripe retry; handleStripeEvent has already un-recorded the event.
    console.error("[deposits] webhook handler failed:", event.id, event.type, err)
    return Response.json({ error: "handler failed" }, { status: 500 })
  }
}
