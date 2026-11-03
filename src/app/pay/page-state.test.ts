import { describe, expect, it } from "vitest"
import { isAutomatedAgent, linkIsLive, payPageState } from "./page-state"

const NOW = Date.parse("2026-11-03T12:00:00Z")
type LinkFields = {
  cancelledAt: Date | null
  expiresAt: Date | null
  processingSince: Date | null
  checkoutSessionId: string | null
}
const live: LinkFields = { cancelledAt: null, expiresAt: null, processingSince: null, checkoutSessionId: null }

function state(
  over: {
    link?: Partial<LinkFields>
    payment?: "scheduled" | "invoiced" | "paid" | "refunded" | "waived" | "cancelled"
    /** The session the payment's money (or clearing bank payment) came through. */
    paidThrough?: string | null
    booking?: "held" | "confirmed" | "cancelled" | "completed"
    returnedPaid?: boolean
  } = {},
) {
  return payPageState({
    link: { ...live, ...over.link },
    payment: { status: over.payment ?? "invoiced", stripeCheckoutSessionId: over.paidThrough ?? null },
    bookingStatus: over.booking ?? "confirmed",
    nowMs: NOW,
    returnedPaid: over.returnedPaid,
  })
}

const cancelled = new Date(NOW - 500)

describe("payPageState", () => {
  it("lets an open payment on a live link be paid", () => {
    expect(state()).toBe("payable")
    expect(state({ payment: "scheduled" })).toBe("payable")
  })

  it("says thank you for a paid payment, even after the link ran out or the booking was cancelled", () => {
    expect(state({ payment: "paid" })).toBe("paid")
    expect(state({ payment: "paid", link: { expiresAt: new Date(NOW - 1000) } })).toBe("paid")
    expect(state({ payment: "paid", booking: "cancelled" })).toBe("paid")
  })

  it("shows a replaced link's holder nothing once the family paid through another link", () => {
    // Link A went to the wrong address and was replaced; the family paid through link B (cs_B).
    expect(state({ payment: "paid", paidThrough: "cs_B", link: { cancelledAt: cancelled } })).toBe("inactive")
    expect(state({ payment: "paid", paidThrough: "cs_B", link: { cancelledAt: cancelled, checkoutSessionId: "cs_A" } })).toBe(
      "inactive",
    )
    expect(state({ payment: "paid", paidThrough: null, link: { cancelledAt: cancelled } })).toBe("inactive")
    expect(state({ payment: "refunded", paidThrough: "cs_B", link: { cancelledAt: cancelled } })).toBe("inactive")
  })

  it("still shows the family their own receipt on a link replaced after they paid through it", () => {
    expect(state({ payment: "paid", paidThrough: "cs_A", link: { cancelledAt: cancelled, checkoutSessionId: "cs_A" } })).toBe(
      "paid",
    )
    expect(
      state({ payment: "refunded", paidThrough: "cs_A", link: { cancelledAt: cancelled, checkoutSessionId: "cs_A" } }),
    ).toBe("refunded")
  })

  it("thanks a payer coming back from a confirmed checkout on a link replaced while they paid", () => {
    expect(state({ payment: "paid", paidThrough: "cs_B", link: { cancelledAt: cancelled }, returnedPaid: true })).toBe("paid")
    // Only for a paid payment: the confirmation alone never opens a closed or open payment's details.
    expect(state({ payment: "invoiced", link: { cancelledAt: cancelled }, returnedPaid: true })).toBe("inactive")
  })

  it("reports a refund", () => {
    expect(state({ payment: "refunded" })).toBe("refunded")
  })

  it("closes cancelled and waived payments", () => {
    expect(state({ payment: "cancelled" })).toBe("inactive")
    expect(state({ payment: "waived" })).toBe("inactive")
  })

  it("closes a cancelled link, an expired link and a cancelled booking", () => {
    expect(state({ link: { cancelledAt: new Date(NOW - 1000) } })).toBe("inactive")
    expect(state({ link: { expiresAt: new Date(NOW - 1000) } })).toBe("inactive")
    expect(state({ link: { expiresAt: new Date(NOW) } })).toBe("inactive")
    expect(state({ booking: "cancelled" })).toBe("inactive")
  })

  it("keeps a link open until its expiry time", () => {
    expect(state({ link: { expiresAt: new Date(NOW + 60_000) } })).toBe("payable")
  })

  it("shows a clearing bank payment as processing, even after the link was replaced or ran out", () => {
    expect(state({ link: { processingSince: new Date(NOW - 1000) } })).toBe("processing")
    expect(state({ link: { processingSince: new Date(NOW - 1000), expiresAt: new Date(NOW - 500) } })).toBe("processing")
    // Replaced while the family's own bank payment (cs_A) clears: they still see it on its way.
    expect(
      state({
        paidThrough: "cs_A",
        link: { processingSince: new Date(NOW - 1000), cancelledAt: cancelled, checkoutSessionId: "cs_A" },
      }),
    ).toBe("processing")
  })

  it("does not tell a replaced link's holder about a bank payment made through another link", () => {
    expect(state({ paidThrough: "cs_B", link: { processingSince: new Date(NOW - 1000), cancelledAt: cancelled } })).toBe(
      "inactive",
    )
  })

  it("closes a payment that was cancelled while its bank payment was clearing", () => {
    expect(state({ payment: "cancelled", link: { processingSince: new Date(NOW - 1000) } })).toBe("inactive")
  })
})

describe("linkIsLive", () => {
  it("is false once cancelled or expired", () => {
    expect(linkIsLive(live, NOW)).toBe(true)
    expect(linkIsLive({ ...live, cancelledAt: new Date(NOW) }, NOW)).toBe(false)
    expect(linkIsLive({ ...live, expiresAt: new Date(NOW) }, NOW)).toBe(false)
    expect(linkIsLive({ ...live, expiresAt: new Date(NOW + 1) }, NOW)).toBe(true)
  })
})

describe("isAutomatedAgent", () => {
  it("flags link-preview fetchers, crawlers and scripts", () => {
    for (const ua of [
      "WhatsApp/2.23.20 A",
      "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Mozilla/5.0 (Windows NT 10.0) HeadlessChrome/120.0 Safari/537.36",
      "curl/8.4.0",
      "python-requests/2.31",
      null,
      "",
    ]) {
      expect(isAutomatedAgent(ua), String(ua)).toBe(true)
    }
  })

  it("lets real browsers through", () => {
    for (const ua of [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Linux; Android 10; CUBOT P40) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
    ]) {
      expect(isAutomatedAgent(ua), ua).toBe(false)
    }
  })
})
