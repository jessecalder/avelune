import { describe, expect, it } from "vitest"
import { checkoutTermsChanged, isPayable, LINK_STATE_LABELS, linkState, paymentTitle, paymentWord, type LinkState } from "./state"

const NOW = Date.parse("2026-11-03T18:00:00Z")
const earlier = new Date(NOW - 60_000)
const later = new Date(NOW + 60_000)

const blank = {
  cancelledAt: null,
  expiresAt: null,
  processingSince: null,
  checkoutStartedAt: null,
  firstOpenedAt: null,
  emailSentAt: null,
}
const invoiced = { status: "invoiced" as const }

describe("linkState", () => {
  it("lets the payment's own status win over the link", () => {
    const cancelledLink = { ...blank, cancelledAt: earlier }
    expect(linkState(cancelledLink, { status: "paid" }, NOW, "held")).toBe("paid")
    expect(linkState(null, { status: "paid" }, NOW, "held")).toBe("paid")
    expect(linkState(blank, { status: "refunded" }, NOW, "held")).toBe("refunded")
    expect(linkState(blank, { status: "cancelled" }, NOW, "held")).toBe("closed")
    expect(linkState(blank, { status: "waived" }, NOW, "held")).toBe("closed")
  })

  it("has no link without one", () => {
    expect(linkState(null, invoiced, NOW, "held")).toBe("no_link")
    expect(linkState(null, { status: "scheduled" }, NOW, "held")).toBe("no_link")
  })

  it("walks the link from created to checkout", () => {
    expect(linkState(blank, invoiced, NOW, "held")).toBe("created")
    expect(linkState({ ...blank, emailSentAt: earlier }, invoiced, NOW, "held")).toBe("sent")
    expect(linkState({ ...blank, emailSentAt: earlier, firstOpenedAt: earlier }, invoiced, NOW, "held")).toBe("opened")
    expect(
      linkState({ ...blank, emailSentAt: earlier, firstOpenedAt: earlier, checkoutStartedAt: earlier }, invoiced, NOW, "held"),
    ).toBe("checkout_started")
    expect(linkState({ ...blank, checkoutStartedAt: earlier, processingSince: earlier }, invoiced, NOW, "held")).toBe(
      "processing",
    )
  })

  it("reports opened even when the email was marked sent later", () => {
    expect(linkState({ ...blank, firstOpenedAt: earlier }, invoiced, NOW, "held")).toBe("opened")
  })

  it("puts cancelled before expired before progress", () => {
    expect(linkState({ ...blank, cancelledAt: earlier, expiresAt: earlier, firstOpenedAt: earlier }, invoiced, NOW, "held")).toBe(
      "cancelled",
    )
    expect(linkState({ ...blank, expiresAt: earlier, firstOpenedAt: earlier }, invoiced, NOW, "held")).toBe("expired")
  })

  it("treats a link as live until the moment it expires", () => {
    expect(linkState({ ...blank, expiresAt: later }, invoiced, NOW, "held")).toBe("created")
    expect(linkState({ ...blank, expiresAt: new Date(NOW) }, invoiced, NOW, "held")).toBe("expired")
  })

  it("closes a cancelled booking's link unless a bank payment is still clearing", () => {
    expect(linkState({ ...blank, emailSentAt: earlier, firstOpenedAt: earlier }, invoiced, NOW, "cancelled")).toBe("closed")
    expect(linkState(null, invoiced, NOW, "cancelled")).toBe("closed")
    expect(linkState({ ...blank, processingSince: earlier }, invoiced, NOW, "cancelled")).toBe("processing")
    // Money that already moved still says so.
    expect(linkState(blank, { status: "paid" }, NOW, "cancelled")).toBe("paid")
    expect(linkState(blank, { status: "refunded" }, NOW, "cancelled")).toBe("refunded")
    expect(linkState({ ...blank, firstOpenedAt: earlier }, invoiced, NOW, "confirmed")).toBe("opened")
  })

  it("has a label for every state", () => {
    const states: LinkState[] = [
      "no_link",
      "created",
      "sent",
      "opened",
      "checkout_started",
      "processing",
      "paid",
      "refunded",
      "closed",
      "cancelled",
      "expired",
    ]
    for (const s of states) expect(LINK_STATE_LABELS[s]).toBeTruthy()
    expect(Object.keys(LINK_STATE_LABELS).sort()).toEqual([...states].sort())
    expect(LINK_STATE_LABELS.processing).toBe("Bank payment clearing")
    // Past tense: the label stays after the family leaves Stripe without paying.
    expect(LINK_STATE_LABELS.checkout_started).toBe("Went to checkout")
  })
})

describe("checkoutTermsChanged", () => {
  const open = { amountCents: 100_000, currency: "usd", status: "invoiced" as const }

  it("is true when an open payment's amount or currency changes, or it is closed", () => {
    expect(checkoutTermsChanged(open, { ...open, amountCents: 150_000 })).toBe(true)
    expect(checkoutTermsChanged(open, { ...open, currency: "eur" })).toBe(true)
    for (const status of ["paid", "cancelled", "waived", "refunded"] as const) {
      expect(checkoutTermsChanged(open, { ...open, status })).toBe(true)
    }
  })

  it("is false for edits that keep the terms, and for payments that were not open", () => {
    expect(checkoutTermsChanged(open, open)).toBe(false)
    expect(checkoutTermsChanged(open, { ...open, status: "scheduled" })).toBe(false)
    expect(checkoutTermsChanged({ ...open, status: "paid" }, { ...open, status: "paid", amountCents: 1 })).toBe(false)
  })
})

describe("isPayable", () => {
  it("is true only for scheduled and invoiced", () => {
    expect(isPayable("scheduled")).toBe(true)
    expect(isPayable("invoiced")).toBe(true)
    for (const s of ["paid", "refunded", "waived", "cancelled"] as const) expect(isPayable(s)).toBe(false)
  })
})

describe("paymentTitle and paymentWord", () => {
  it("names the standard kinds", () => {
    expect(paymentTitle("deposit", null)).toBe("Deposit")
    expect(paymentTitle("balance", null)).toBe("Balance")
    expect(paymentTitle("instalment", null)).toBe("Instalment")
    expect(paymentWord("deposit", null)).toBe("deposit")
    expect(paymentWord("balance", null)).toBe("remaining balance")
    expect(paymentWord("instalment", null)).toBe("instalment")
  })

  it("ignores the label for standard kinds", () => {
    expect(paymentTitle("deposit", "Founding family")).toBe("Deposit")
    expect(paymentWord("balance", "Final")).toBe("remaining balance")
  })

  it("uses the label of an extra, as typed", () => {
    expect(paymentTitle("extra", "Extra night in Antigua")).toBe("Extra night in Antigua")
    expect(paymentWord("extra", "Extra night in Antigua")).toBe("Extra night in Antigua")
  })

  it("falls back for an extra without a label", () => {
    expect(paymentTitle("extra", null)).toBe("Payment")
    expect(paymentWord("extra", null)).toBe("payment")
    expect(paymentTitle("extra", "  ")).toBe("Payment")
  })
})
