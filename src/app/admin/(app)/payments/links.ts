import { desc, inArray, sql } from "drizzle-orm"
import { getDb } from "@/db/client"
import { paymentLinks } from "@/db/schema"
import type { LinkTracking } from "./summary"

/**
 * One query for a whole list of payments: each payment's live link, or its newest cancelled one
 * when it has no live link. Payments that never had a link are absent from the map.
 */
export async function loadCurrentLinks(paymentIds: string[]): Promise<Map<string, LinkTracking>> {
  const current = new Map<string, LinkTracking>()
  if (paymentIds.length === 0) return current
  const rows = await getDb()
    .select({
      id: paymentLinks.id,
      paymentId: paymentLinks.paymentId,
      createdAt: paymentLinks.createdAt,
      expiresAt: paymentLinks.expiresAt,
      cancelledAt: paymentLinks.cancelledAt,
      emailSentAt: paymentLinks.emailSentAt,
      firstOpenedAt: paymentLinks.firstOpenedAt,
      lastOpenedAt: paymentLinks.lastOpenedAt,
      checkoutStartedAt: paymentLinks.checkoutStartedAt,
      processingSince: paymentLinks.processingSince,
    })
    .from(paymentLinks)
    .where(inArray(paymentLinks.paymentId, paymentIds))
    .orderBy(sql`${paymentLinks.cancelledAt} is null desc`, desc(paymentLinks.createdAt))
  for (const row of rows) if (!current.has(row.paymentId)) current.set(row.paymentId, row)
  return current
}

/**
 * The clock for the admin pages' link states. Call it only after requireAdmin(), which awaits
 * connection(): a render before that must not read the time.
 */
export function currentMs(): number {
  return Date.now()
}
