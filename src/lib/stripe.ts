import Stripe from "stripe"

// Server-only: holds the secret key. Never import from a client component.
let client: Stripe | undefined

export function getStripe(): Stripe {
  if (client) return client
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set; cannot talk to Stripe.")
  }
  client = new Stripe(key, { typescript: true })
  return client
}
