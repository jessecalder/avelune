/**
 * Link to a payment in the Stripe dashboard. Test-mode keys (sk_test_ / rk_test_) open the test
 * dashboard; anything else opens live. Read at request time (call after requireAdmin()).
 */
export function stripePaymentUrl(paymentIntentId: string): string {
  const test = /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")
  return `https://dashboard.stripe.com/${test ? "test/" : ""}payments/${encodeURIComponent(paymentIntentId)}`
}
