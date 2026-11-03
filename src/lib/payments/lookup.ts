import { eq } from "drizzle-orm"
import { getDb } from "../../db/client"
import { paymentLinks } from "../../db/schema"
import { isLinkToken } from "./token"

/**
 * Whether a payment link with this token exists, live or not. The proxy asks before /pay renders,
 * because the page streams and can no longer answer 404 once it has started. Kept apart from
 * store.ts so the proxy bundle does not pull in Stripe.
 */
export async function linkTokenExists(token: string): Promise<boolean> {
  if (!isLinkToken(token)) return false
  const rows = await getDb()
    .select({ id: paymentLinks.id })
    .from(paymentLinks)
    .where(eq(paymentLinks.token, token))
    .limit(1)
  return rows.length > 0
}
