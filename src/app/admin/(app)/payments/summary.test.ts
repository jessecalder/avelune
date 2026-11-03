import { describe, expect, it } from "vitest"
import { lastActivity, tallyNote, type LinkTracking } from "./summary"

const at = (iso: string) => new Date(iso)

const link = (over: Partial<LinkTracking> = {}): LinkTracking => ({
  id: "l",
  paymentId: "p",
  createdAt: at("2026-11-01T00:00:00Z"),
  expiresAt: null,
  cancelledAt: null,
  emailSentAt: null,
  firstOpenedAt: null,
  lastOpenedAt: null,
  checkoutStartedAt: null,
  processingSince: null,
  ...over,
})

describe("lastActivity", () => {
  it("is null when nothing has happened", () => {
    expect(lastActivity(undefined, null)).toBeNull()
    expect(lastActivity(link(), null)).toBeNull()
  })

  it("does not count the link being created or cancelled", () => {
    expect(lastActivity(link({ cancelledAt: at("2026-11-05T00:00:00Z") }), null)).toBeNull()
  })

  it("picks the latest of emailed, opened, checkout, bank payment and paid", () => {
    const l = link({
      emailSentAt: at("2026-11-02T10:00:00Z"),
      lastOpenedAt: at("2026-11-03T10:00:00Z"),
      checkoutStartedAt: at("2026-11-03T11:00:00Z"),
    })
    expect(lastActivity(l, null)).toEqual(at("2026-11-03T11:00:00Z"))
    expect(lastActivity(l, at("2026-11-04T09:00:00Z"))).toEqual(at("2026-11-04T09:00:00Z"))
    expect(lastActivity(l, at("2026-11-01T09:00:00Z"))).toEqual(at("2026-11-03T11:00:00Z"))
  })

  it("uses the paid time when there is no link", () => {
    expect(lastActivity(undefined, at("2026-11-04T09:00:00Z"))).toEqual(at("2026-11-04T09:00:00Z"))
  })
})

describe("tallyNote", () => {
  it("counts payments in the singular and plural", () => {
    expect(tallyNote({ cents: 100, count: 1, otherCurrencies: 0 })).toBe("1 payment")
    expect(tallyNote({ cents: 0, count: 0, otherCurrencies: 0 })).toBe("0 payments")
    expect(tallyNote({ cents: 900, count: 3, otherCurrencies: 0 })).toBe("3 payments")
  })

  it("says when other currencies were left out", () => {
    expect(tallyNote({ cents: 900, count: 3, otherCurrencies: 2 })).toBe("3 payments, plus 2 in other currencies, not counted")
  })
})
