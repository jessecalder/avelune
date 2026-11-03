/** Server-only configuration for private payment links. */

function siteUrlOrNull(): string | null {
  const url = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "")
  return url === "" ? null : url
}

/** Links can only be created and paid when Stripe, the database and the public site URL are all set. */
export function paymentLinksConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.DATABASE_URL && siteUrlOrNull() !== null
}

/** True for test-mode keys (sk_test_ / rk_test_): the page and the admin say no real money moves. */
export function stripeTestMode(): boolean {
  return /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "")
}

/** NEXT_PUBLIC_SITE_URL without trailing slashes. Throws when unset. */
export function siteUrl(): string {
  const url = siteUrlOrNull()
  if (!url) throw new Error("NEXT_PUBLIC_SITE_URL is not set")
  return url
}

/** The private link a family opens. */
export function payUrl(token: string): string {
  return `${siteUrl()}/pay/${token}`
}
