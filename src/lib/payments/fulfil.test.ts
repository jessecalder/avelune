import { describe, expect, it } from "vitest"
import {
  failureApplies,
  failureNote,
  pacificToday,
  paidNote,
  planPaid,
  planRefund,
  startsClearing,
} from "./fulfil"

describe("planPaid", () => {
  it("pays a payment that is still open", () => {
    expect(planPaid({ status: "scheduled", stripePaymentIntentId: null }, "pi_1", false)).toBe("pay")
    expect(planPaid({ status: "invoiced", stripePaymentIntentId: null }, "pi_1", false)).toBe("pay")
    // A bank payment recorded as processing already carries the intent: completing it is still a payment.
    expect(planPaid({ status: "invoiced", stripePaymentIntentId: "pi_1" }, "pi_1", true)).toBe("pay")
  })

  it("leaves a payment already settled by this intent alone", () => {
    expect(planPaid({ status: "paid", stripePaymentIntentId: "pi_1" }, "pi_1", false)).toBe("unchanged")
    expect(planPaid({ status: "refunded", stripePaymentIntentId: "pi_1" }, "pi_1", false)).toBe("unchanged")
    expect(planPaid({ status: "paid", stripePaymentIntentId: "pi_1" }, "pi_1", true)).toBe("unchanged")
  })

  it("records money from a second intent as an extra", () => {
    expect(planPaid({ status: "paid", stripePaymentIntentId: "pi_1" }, "pi_2", false)).toBe("extra")
    expect(planPaid({ status: "paid", stripePaymentIntentId: null }, "pi_2", false)).toBe("extra")
    expect(planPaid({ status: "paid", stripePaymentIntentId: "pi_1" }, null, false)).toBe("extra")
  })

  it("records money for a closed payment as an extra", () => {
    for (const status of ["cancelled", "waived", "refunded"] as const) {
      expect(planPaid({ status, stripePaymentIntentId: null }, "pi_9", false)).toBe("extra")
      expect(planPaid({ status, stripePaymentIntentId: null }, "pi_9", true)).toBe("extra")
    }
  })

  it("reopens a payment closed while its own bank payment was clearing", () => {
    expect(planPaid({ status: "cancelled", stripePaymentIntentId: "pi_1" }, "pi_1", true)).toBe("reopen")
    expect(planPaid({ status: "waived", stripePaymentIntentId: "pi_1" }, "pi_1", true)).toBe("reopen")
  })

  it("does not reopen a card payment the owner closed long after it was paid", () => {
    // The family revisits the receipt URL, or Stripe retries the completed event: nothing is clearing.
    expect(planPaid({ status: "cancelled", stripePaymentIntentId: "pi_1" }, "pi_1", false)).toBe("unchanged")
    expect(planPaid({ status: "waived", stripePaymentIntentId: "pi_1" }, "pi_1", false)).toBe("unchanged")
  })
})

describe("startsClearing", () => {
  const waitingOn = (sessionId: string | null) => ({ processingSince: null, checkoutSessionId: sessionId })

  it("starts the wait for the session the link is waiting on", () => {
    expect(startsClearing({ status: "invoiced" }, waitingOn("cs_1"), "cs_1")).toBe(true)
    expect(startsClearing({ status: "scheduled" }, waitingOn("cs_1"), "cs_1")).toBe(true)
  })

  it("ignores a failed session coming back (reloaded return page, late completed event)", () => {
    // failAsyncPayment forgets the link's session, so the old one no longer matches.
    expect(startsClearing({ status: "invoiced" }, waitingOn(null), "cs_1")).toBe(false)
    expect(startsClearing({ status: "invoiced" }, waitingOn("cs_2"), "cs_1")).toBe(false)
  })

  it("does nothing when already clearing, closed, or without a link", () => {
    expect(startsClearing({ status: "invoiced" }, { processingSince: new Date(), checkoutSessionId: "cs_1" }, "cs_1")).toBe(false)
    expect(startsClearing({ status: "paid" }, waitingOn("cs_1"), "cs_1")).toBe(false)
    expect(startsClearing({ status: "cancelled" }, waitingOn("cs_1"), "cs_1")).toBe(false)
    expect(startsClearing({ status: "invoiced" }, null, "cs_1")).toBe(false)
  })
})

describe("failureApplies", () => {
  const idle = { processingSince: null, checkoutSessionId: null }

  it("applies while the link waits on a bank payment or still points at this session", () => {
    expect(failureApplies({ stripePaymentIntentId: null }, { ...idle, processingSince: new Date() }, "cs_1", "pi_1")).toBe(true)
    expect(failureApplies({ stripePaymentIntentId: null }, { ...idle, checkoutSessionId: "cs_1" }, "cs_1", "pi_1")).toBe(true)
  })

  it("applies when the payment still carries the failed intent", () => {
    expect(failureApplies({ stripePaymentIntentId: "pi_1" }, idle, "cs_1", "pi_1")).toBe(true)
  })

  it("does nothing once undone, so a repeat of the event is harmless", () => {
    expect(failureApplies({ stripePaymentIntentId: null }, idle, "cs_1", "pi_1")).toBe(false)
    expect(failureApplies({ stripePaymentIntentId: "pi_2" }, { ...idle, checkoutSessionId: "cs_2" }, "cs_1", "pi_1")).toBe(false)
    expect(failureApplies({ stripePaymentIntentId: null }, idle, "cs_1", null)).toBe(false)
  })
})

describe("failureNote", () => {
  const line = "Balance $2,500.00 (booking AV-0001)"

  it("tells the owner the link works again for an open payment", () => {
    expect(failureNote("invoiced", line)).toEqual({
      summary: "Bank payment for Balance $2,500.00 (booking AV-0001) failed; the link works again.",
      followUp: true,
    })
  })

  it("flags a payment marked paid by hand whose bank payment then failed", () => {
    const n = failureNote("paid", line)
    expect(n.summary).toBe(
      "Check this: the bank payment for Balance $2,500.00 (booking AV-0001) failed after the payment was marked paid. No money arrived through Stripe; check how it was paid.",
    )
    expect(n.followUp).toBe(true)
    expect(failureNote("refunded", line).followUp).toBe(true)
  })

  it("only notes it for a payment that was cancelled or waived", () => {
    expect(failureNote("cancelled", line)).toEqual({
      summary: "Bank payment for Balance $2,500.00 (booking AV-0001) failed. The payment was already cancelled, so nothing else changes.",
      followUp: false,
    })
    expect(failureNote("waived", line).followUp).toBe(false)
  })
})

describe("paidNote", () => {
  const line = "Deposit $1,000.00 (booking AV-0007)"
  const base = { line, reopenedFrom: null, wasClearing: false, bookingStatus: "held" as const, mismatch: null }

  it("logs a plain card payment without a follow-up", () => {
    expect(paidNote(base)).toEqual({ summary: "Paid online: Deposit $1,000.00 (booking AV-0007).", followUp: false })
  })

  it("asks the owner to tell the family when a bank payment cleared", () => {
    expect(paidNote({ ...base, wasClearing: true })).toEqual({
      summary: "Bank payment cleared: Deposit $1,000.00 (booking AV-0007). Let the family know it arrived.",
      followUp: true,
    })
  })

  it("flags money that arrived after the booking was cancelled", () => {
    expect(paidNote({ ...base, bookingStatus: "cancelled" })).toEqual({
      summary: "Check this: Deposit $1,000.00 (booking AV-0007) was paid online after the booking was cancelled. Refund it in Stripe if needed.",
      followUp: true,
    })
  })

  it("flags a payment reopened by a bank payment that cleared after it was closed", () => {
    const n = paidNote({ ...base, reopenedFrom: "cancelled", wasClearing: true })
    expect(n.summary).toBe(
      "Check this: Deposit $1,000.00 (booking AV-0007) was paid online by bank payment after it was marked cancelled. It is marked paid again.",
    )
    expect(n.followUp).toBe(true)
  })

  it("says what to do when Stripe took a different amount", () => {
    const short = paidNote({
      ...base,
      mismatch: { taken: { cents: 100_000, currency: "usd" }, recorded: { cents: 150_000, currency: "usd" } },
    })
    expect(short.summary).toBe(
      "Paid online: Deposit $1,000.00 (booking AV-0007). Stripe took $1,000.00; the payment was $1,500.00. Request the difference.",
    )
    expect(short.followUp).toBe(true)
    const over = paidNote({
      ...base,
      mismatch: { taken: { cents: 100_000, currency: "usd" }, recorded: { cents: 80_000, currency: "usd" } },
    })
    expect(over.summary).toMatch(/Refund the excess in Stripe if it was not meant\.$/)
    const other = paidNote({
      ...base,
      mismatch: { taken: { cents: 100_000, currency: "usd" }, recorded: { cents: 100_000, currency: "eur" } },
    })
    expect(other.summary).toMatch(/Check what the family still owes\.$/)
  })
})

describe("planRefund", () => {
  const paid = { status: "paid" as const, amountCents: 100_000, amountRefundedCents: 0 }

  it("marks a fully refunded payment refunded", () => {
    expect(planRefund(paid, { refunded: true, amount_refunded: 100_000 })).toEqual({
      status: "refunded",
      amountRefundedCents: 100_000,
    })
  })

  it("records a partial refund without changing the status", () => {
    expect(planRefund(paid, { refunded: false, amount_refunded: 25_000 })).toEqual({
      status: "paid",
      amountRefundedCents: 25_000,
    })
  })

  it("never refunds more than the payment", () => {
    expect(planRefund(paid, { refunded: false, amount_refunded: 150_000 })).toEqual({
      status: "paid",
      amountRefundedCents: 100_000,
    })
  })

  it("is unchanged when the same figures are already recorded", () => {
    expect(planRefund({ ...paid, amountRefundedCents: 25_000 }, { refunded: false, amount_refunded: 25_000 })).toBeNull()
    expect(
      planRefund({ status: "refunded", amountCents: 100_000, amountRefundedCents: 100_000 }, { refunded: true, amount_refunded: 100_000 }),
    ).toBeNull()
  })

  it("does not lower the refunded amount when an older event arrives late", () => {
    const refunded = { status: "refunded" as const, amountCents: 100_000, amountRefundedCents: 100_000 }
    expect(planRefund(refunded, { refunded: false, amount_refunded: 25_000 })).toBeNull()
    expect(planRefund({ ...paid, amountRefundedCents: 60_000 }, { refunded: false, amount_refunded: 25_000 })).toBeNull()
  })

  it("upgrades a recorded partial refund to a full one", () => {
    expect(planRefund({ ...paid, amountRefundedCents: 25_000 }, { refunded: true, amount_refunded: 100_000 })).toEqual({
      status: "refunded",
      amountRefundedCents: 100_000,
    })
  })

  it("only records the amount for a payment that was never paid", () => {
    const waived = { status: "waived" as const, amountCents: 100_000, amountRefundedCents: 0 }
    expect(planRefund(waived, { refunded: true, amount_refunded: 100_000 })).toEqual({
      status: "waived",
      amountRefundedCents: 100_000,
    })
  })
})

describe("pacificToday", () => {
  it("is the calendar date in Pacific time", () => {
    // 02:00 UTC on Nov 4 is still the evening of Nov 3 in Pacific time.
    expect(pacificToday(new Date("2026-11-04T02:00:00Z"))).toBe("2026-11-03")
    expect(pacificToday(new Date("2026-11-04T09:00:00Z"))).toBe("2026-11-04")
    // Summer time (UTC-7): 06:59 UTC is 23:59 the day before.
    expect(pacificToday(new Date("2027-07-10T06:59:00Z"))).toBe("2027-07-09")
    expect(pacificToday(new Date("2027-07-10T07:00:00Z"))).toBe("2027-07-10")
  })
})
