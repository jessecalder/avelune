import type { PaymentLink } from "@/db/schema"

/**
 * What a list needs to say where a payment's link stands. The token is left out on purpose: it
 * is a capability, and only the payment's own page has a reason to load it.
 */
export type LinkTracking = Pick<
  PaymentLink,
  | "id"
  | "paymentId"
  | "createdAt"
  | "expiresAt"
  | "cancelledAt"
  | "emailSentAt"
  | "firstOpenedAt"
  | "lastOpenedAt"
  | "checkoutStartedAt"
  | "processingSince"
>

/** The latest of: emailed, opened, went to checkout, bank payment submitted, paid. */
export function lastActivity(link: LinkTracking | undefined, paidAt: Date | null): Date | null {
  const times = [link?.emailSentAt, link?.lastOpenedAt, link?.checkoutStartedAt, link?.processingSince, paidAt]
  let latest: Date | null = null
  for (const t of times) if (t && (!latest || t.getTime() > latest.getTime())) latest = t
  return latest
}

/** A count and a sum in one currency, plus how many payments in other currencies were left out. */
export type MoneyTally = { cents: number; count: number; otherCurrencies: number }

/** "3 payments", plus a note when others in another currency are not in the sum. */
export function tallyNote(t: MoneyTally): string {
  const base = `${t.count} ${t.count === 1 ? "payment" : "payments"}`
  if (t.otherCurrencies === 0) return base
  return `${base}, plus ${t.otherCurrencies} in other currencies, not counted`
}
