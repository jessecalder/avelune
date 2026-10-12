import { z } from "zod"
import { site } from "../../content/site"
import type { JourneyId } from "./types"

export function depositsEnabled(): boolean {
  return (
    process.env.DEPOSITS_ENABLED === "true" &&
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.DATABASE_URL
  )
}

function journeyEntry(id: JourneyId) {
  const place = site.destinations.places.find((p) => p.id === id)
  if (!place) throw new Error(`site.destinations.places has no entry for ${id}`)
  return { label: `${place.name}, ${place.country}`, window: place.when }
}

export const JOURNEYS: Record<JourneyId, { label: string; window: string }> = {
  "san-sebastian": journeyEntry("san-sebastian"),
  antigua: journeyEntry("antigua"),
}

const termsSchema = z.object({
  // 100000 cents is a placeholder: the owner must set the real amount.
  amountCents: z.coerce.number().int().min(5000),
  currency: z
    .string()
    .regex(/^[A-Za-z]{3}$/)
    .transform((c) => c.toLowerCase()),
  holdDays: z.coerce.number().int().min(1).max(60),
})

export type DepositTerms = z.output<typeof termsSchema>

export function depositTerms(): DepositTerms {
  return termsSchema.parse({
    amountCents: process.env.DEPOSIT_AMOUNT_CENTS || "100000",
    currency: process.env.DEPOSIT_CURRENCY || "usd",
    holdDays: process.env.DEPOSIT_HOLD_DAYS || "14",
  })
}
