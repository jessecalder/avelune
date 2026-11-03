import Stripe from "stripe"

// Server-only: holds the secret key. Never import from a client component.
let client: Stripe | undefined

export function getStripe(): Stripe {
  if (client) return client
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set; cannot talk to Stripe.")
  }
  // Bounded: a checkout holds row locks and a pooled connection while it waits on Stripe, so a
  // slow Stripe must not hold them for the SDK's default 80 s × 3 tries. POST retries are safe:
  // the SDK sends an idempotency key with them.
  client = new Stripe(key, { typescript: true, timeout: 20_000, maxNetworkRetries: 1 })
  return client
}
