/**
 * Pure payment-link helpers. Safe to import from client components: only types come from the
 * schema, nothing here touches the database.
 */
import type { Booking, Payment, PaymentLink } from "../../db/schema"

export type LinkState =
  | "no_link"
  | "created"
  | "sent"
  | "opened"
  | "checkout_started"
  | "processing"
  | "paid"
  | "refunded"
  | "closed"
  | "cancelled"
  | "expired"

export const LINK_STATE_LABELS: Record<LinkState, string> = {
  no_link: "No link",
  created: "Link ready, not sent",
  sent: "Sent",
  opened: "Opened",
  // Past tense: nothing says when the family left Stripe, and an abandoned checkout keeps this.
  checkout_started: "Went to checkout",
  processing: "Bank payment clearing",
  paid: "Paid",
  refunded: "Refunded",
  closed: "Closed",
  cancelled: "Link cancelled",
  expired: "Link expired",
}

/**
 * Where a payment stands from the family's side. The payment's own status wins (paid, refunded,
 * closed), then a cancelled booking (closed, unless a bank payment is still clearing); only then
 * does the link's tracking say how far the family got.
 */
export function linkState(
  link: Pick<
    PaymentLink,
    "cancelledAt" | "expiresAt" | "processingSince" | "checkoutStartedAt" | "firstOpenedAt" | "emailSentAt"
  > | null,
  payment: Pick<Payment, "status">,
  nowMs: number,
  bookingStatus: Booking["status"],
): LinkState {
  if (payment.status === "paid") return "paid"
  if (payment.status === "refunded") return "refunded"
  if (payment.status === "cancelled" || payment.status === "waived") return "closed"
  // The family can no longer pay a cancelled booking's link, but money already on its way still comes.
  if (bookingStatus === "cancelled") return link?.processingSince ? "processing" : "closed"
  if (!link) return "no_link"
  if (link.cancelledAt) return "cancelled"
  if (link.expiresAt && link.expiresAt.getTime() <= nowMs) return "expired"
  if (link.processingSince) return "processing"
  if (link.checkoutStartedAt) return "checkout_started"
  if (link.firstOpenedAt) return "opened"
  if (link.emailSentAt) return "sent"
  return "created"
}

/** A payment the family can still pay: scheduled or invoiced. */
export function isPayable(paymentStatus: Payment["status"]): boolean {
  return paymentStatus === "scheduled" || paymentStatus === "invoiced"
}

/**
 * Whether an edit to an open payment changes what the family would be charged, or closes it. A
 * Checkout Session the family already has open still charges the old terms, so it has to go.
 * A payment that was not open has no checkout to close.
 */
export function checkoutTermsChanged(
  before: Pick<Payment, "amountCents" | "currency" | "status">,
  after: Pick<Payment, "amountCents" | "currency" | "status">,
): boolean {
  if (!isPayable(before.status)) return false
  return before.amountCents !== after.amountCents || before.currency !== after.currency || !isPayable(after.status)
}

/** Heading form: "Deposit", "Balance", "Instalment", or the label of an extra. */
export function paymentTitle(kind: Payment["kind"], label: string | null): string {
  switch (kind) {
    case "deposit":
      return "Deposit"
    case "balance":
      return "Balance"
    case "instalment":
      return "Instalment"
    case "extra":
      return label?.trim() || "Payment"
  }
}

/** Prose form for a sentence: "deposit", "remaining balance", "instalment", or the label as typed. */
export function paymentWord(kind: Payment["kind"], label: string | null): string {
  switch (kind) {
    case "deposit":
      return "deposit"
    case "balance":
      return "remaining balance"
    case "instalment":
      return "instalment"
    case "extra":
      return label?.trim() || "payment"
  }
}
