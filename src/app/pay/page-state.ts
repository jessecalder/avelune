import type { Booking, Payment, PaymentLink } from "@/db/schema"

/** What the family sees at /pay/<token>. */
export type PayPageState = "payable" | "paid" | "processing" | "refunded" | "inactive"

/**
 * The page's state from the payment and its link. A cancelled or replaced link shows nothing
 * about the payment, unless the money moved through this very link (the family coming back to
 * their own receipt). Then money already moved wins (paid, refunded), then a closed payment, then
 * a bank payment that is clearing; only an open payment on a live link on a live booking can be paid.
 *
 * `returnedPaid`: the visitor just came back from a paid checkout that Stripe confirmed belongs
 * to this link, so they are the payer even if the link was replaced while they were paying.
 */
export function payPageState(input: {
  link: Pick<PaymentLink, "cancelledAt" | "expiresAt" | "processingSince" | "checkoutSessionId">
  payment: Pick<Payment, "status" | "stripeCheckoutSessionId">
  bookingStatus: Booking["status"]
  nowMs: number
  returnedPaid?: boolean
}): PayPageState {
  const { link, payment, bookingStatus, nowMs, returnedPaid = false } = input
  if (link.cancelledAt) {
    const paidHere = !!payment.stripeCheckoutSessionId && payment.stripeCheckoutSessionId === link.checkoutSessionId
    if (!paidHere && !(returnedPaid && payment.status === "paid")) return "inactive"
  }
  if (payment.status === "paid") return "paid"
  if (payment.status === "refunded") return "refunded"
  if (payment.status === "cancelled" || payment.status === "waived") return "inactive"
  if (link.processingSince) return "processing"
  if (link.cancelledAt) return "inactive"
  if (link.expiresAt && link.expiresAt.getTime() <= nowMs) return "inactive"
  if (bookingStatus === "cancelled") return "inactive"
  return "payable"
}

/** A link that has not been cancelled and has not run out. */
export function linkIsLive(link: Pick<PaymentLink, "cancelledAt" | "expiresAt">, nowMs: number): boolean {
  return !link.cancelledAt && !(link.expiresAt && link.expiresAt.getTime() <= nowMs)
}

const AUTOMATED_AGENTS =
  /googlebot|bingbot|applebot|slackbot|twitterbot|linkedinbot|discordbot|telegrambot|facebookexternalhit|facebot|whatsapp|skypeuripreview|crawler|spider|headlesschrome|curl\/|wget\/|python-requests/i

/**
 * Link-preview fetchers (chat apps, search crawlers) and scripts are not the family reading the page,
 * so they do not count as an open. Email security scanners look like browsers and still get through.
 */
export function isAutomatedAgent(userAgent: string | null): boolean {
  return !userAgent || AUTOMATED_AGENTS.test(userAgent)
}
