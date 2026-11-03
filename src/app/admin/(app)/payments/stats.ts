import { and, count, eq, gt, inArray, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm"
import { getDb } from "@/db/client"
import { paymentLinks, payments } from "@/db/schema"
import type { MoneyTally } from "./summary"

/** Sums are in one currency; payments in others are counted separately and left out of the money. */
export const STATS_CURRENCY = "usd"

export type PaymentStats = {
  outstanding: MoneyTally
  overdue: MoneyTally
  paidLast30Days: MoneyTally
  /** Live links that were emailed and not yet opened, on payments still waiting. */
  sentNotOpened: number
}

/** Today in Pacific time, from the database so a render never reads the clock. */
export const PACIFIC_TODAY = sql`(now() at time zone 'America/Los_Angeles')::date`

/**
 * A bank payment for this payment is clearing (on any of its links, cancelled ones included: the
 * money still comes). Such a payment is not overdue: the family has paid and the bank is slow.
 */
export const CLEARING = sql`exists (select 1 from payment_links pl where pl.payment_id = ${payments.id} and pl.processing_since is not null)`

/** Scheduled or invoiced and past its due date (Pacific), with no bank payment clearing. */
export const OVERDUE = sql`${payments.status} in ('scheduled', 'invoiced') and ${payments.dueOn} < ${PACIFIC_TODAY} and not ${CLEARING}`

/** Scheduled or invoiced: the family still owes it. */
const OPEN = sql`${payments.status} in ('scheduled', 'invoiced')`
const MAIN = sql`${payments.currency} = ${STATS_CURRENCY}`

/** count / sum / other-currency count over the payments matching `where`, in one select. */
function tally(where: SQL, amount: SQL) {
  return {
    count: sql<number>`count(*) filter (where ${where} and ${MAIN})::int`,
    cents: sql<number>`coalesce(sum(${amount}) filter (where ${where} and ${MAIN}), 0)::float8`,
    other: sql<number>`count(*) filter (where ${where} and not (${MAIN}))::int`,
  }
}

/** The two queries behind the figures, built but not run. */
export function paymentStatsQueries() {
  const db = getDb()
  const owed = sql`${payments.amountCents}`
  const net = sql`${payments.amountCents} - ${payments.amountRefundedCents}`
  const outstanding = tally(OPEN, owed)
  const overdue = tally(OVERDUE, owed)
  const paid = tally(sql`${payments.status} = 'paid' and ${payments.paidAt} >= now() - interval '30 days'`, net)

  return {
    sums: db
      .select({
        outstandingCount: outstanding.count,
        outstandingCents: outstanding.cents,
        outstandingOther: outstanding.other,
        overdueCount: overdue.count,
        overdueCents: overdue.cents,
        overdueOther: overdue.other,
        paidCount: paid.count,
        paidCents: paid.cents,
        paidOther: paid.other,
      })
      .from(payments),
    sent: db
      .select({ n: count() })
      .from(paymentLinks)
      .innerJoin(payments, eq(payments.id, paymentLinks.paymentId))
      .where(
        and(
          isNull(paymentLinks.cancelledAt),
          isNotNull(paymentLinks.emailSentAt),
          isNull(paymentLinks.firstOpenedAt),
          inArray(payments.status, ["scheduled", "invoiced"]),
          or(isNull(paymentLinks.expiresAt), gt(paymentLinks.expiresAt, sql`now()`)),
        ),
      ),
  }
}

/** The figures on the Payments page and the overview. Call after requireAdmin(). */
export async function loadPaymentStats(): Promise<PaymentStats> {
  const q = paymentStatsQueries()
  const [[sums], [sent]] = await Promise.all([q.sums, q.sent])

  return {
    outstanding: { cents: sums.outstandingCents, count: sums.outstandingCount, otherCurrencies: sums.outstandingOther },
    overdue: { cents: sums.overdueCents, count: sums.overdueCount, otherCurrencies: sums.overdueOther },
    paidLast30Days: { cents: sums.paidCents, count: sums.paidCount, otherCurrencies: sums.paidOther },
    sentNotOpened: sent?.n ?? 0,
  }
}
