import { afterEach, describe, expect, it, vi } from "vitest"
import { afterFailedExpire, buildSessionParams, canReuseSession, checkoutGate, isMissingCustomer } from "./checkout"

afterEach(() => vi.unstubAllEnvs())

const NOW = Date.parse("2026-11-03T18:00:00Z")
const live = { cancelledAt: null, expiresAt: null, processingSince: null }
const gate = (over: Partial<Parameters<typeof checkoutGate>[0]> = {}) =>
  checkoutGate({ link: live, payment: { status: "invoiced" }, bookingStatus: "held", nowMs: NOW, ...over })

describe("checkoutGate", () => {
  it("lets an open payment on a live link through", () => {
    expect(gate()).toBeNull()
    expect(gate({ payment: { status: "scheduled" } })).toBeNull()
    expect(gate({ bookingStatus: "confirmed" })).toBeNull()
  })

  it("stops a cancelled or expired link", () => {
    expect(gate({ link: { ...live, cancelledAt: new Date(NOW - 1000) } })).toBe("inactive")
    expect(gate({ link: { ...live, expiresAt: new Date(NOW - 1000) } })).toBe("inactive")
    expect(gate({ link: { ...live, expiresAt: new Date(NOW) } })).toBe("inactive")
    expect(gate({ link: { ...live, expiresAt: new Date(NOW + 1000) } })).toBeNull()
  })

  it("stops a cancelled booking and closed payments", () => {
    expect(gate({ bookingStatus: "cancelled" })).toBe("inactive")
    for (const status of ["cancelled", "waived", "refunded"] as const) {
      expect(gate({ payment: { status } })).toBe("inactive")
    }
  })

  it("says paid for a paid payment", () => {
    expect(gate({ payment: { status: "paid" } })).toBe("paid")
  })

  it("says processing while a bank payment clears", () => {
    expect(gate({ link: { ...live, processingSince: new Date(NOW - 1000) } })).toBe("processing")
  })

  it("puts a dead link ahead of paid", () => {
    expect(gate({ link: { ...live, cancelledAt: new Date(NOW - 1000) }, payment: { status: "paid" } })).toBe("inactive")
  })
})

describe("canReuseSession", () => {
  const payment = { amountCents: 100_000, currency: "usd" }
  const open = {
    status: "open" as const,
    url: "https://checkout.stripe.com/c/pay/cs_test_1",
    amount_total: 100_000,
    currency: "usd",
    expires_at: Math.floor(NOW / 1000) + 3600,
  }

  it("hands back an open session that still matches", () => {
    expect(canReuseSession(open, payment, NOW)).toBe(true)
  })

  it("replaces a session whose amount or currency no longer matches", () => {
    expect(canReuseSession({ ...open, amount_total: 90_000 }, payment, NOW)).toBe(false)
    expect(canReuseSession({ ...open, currency: "eur" }, payment, NOW)).toBe(false)
    expect(canReuseSession(open, { amountCents: 120_000, currency: "usd" }, NOW)).toBe(false)
  })

  it("replaces a session that is not open or has almost run out", () => {
    expect(canReuseSession({ ...open, status: "expired" }, payment, NOW)).toBe(false)
    expect(canReuseSession({ ...open, status: "complete" }, payment, NOW)).toBe(false)
    expect(canReuseSession({ ...open, url: null }, payment, NOW)).toBe(false)
    expect(canReuseSession({ ...open, expires_at: Math.floor(NOW / 1000) + 120 }, payment, NOW)).toBe(false)
  })
})

describe("buildSessionParams", () => {
  const view = {
    link: { id: "11111111-1111-4111-8111-111111111111" },
    payment: {
      id: "22222222-2222-4222-8222-222222222222",
      kind: "deposit" as const,
      label: null,
      amountCents: 100_000,
      currency: "usd",
    },
    booking: { id: "33333333-3333-4333-8333-333333333333", ref: "AV-0007", status: "held" as const },
    family: {
      id: "44444444-4444-4444-8444-444444444444",
      familyName: "The Calder family",
      primaryContactName: "Maya",
      email: "maya@example.com",
      stripeCustomerId: null as string | null,
    },
    departure: {
      id: "55555555-5555-4555-8555-555555555555",
      name: "San Sebastián, July 2027",
      journey: "san-sebastian" as const,
      startsOn: "2027-07-10",
      endsOn: "2027-07-19",
    },
  }
  const token = "T".repeat(43)

  function build(over: { stripeCustomerId?: string | null } = {}) {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://avelune.example/")
    const family = { ...view.family, ...over }
    return buildSessionParams({ ...view, family }, token, 1_800_000_000)
  }

  it("charges the payment's amount in its currency as one line", () => {
    const params = build()
    expect(params.mode).toBe("payment")
    expect(params.line_items).toEqual([
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 100_000,
          product_data: {
            name: "Deposit · San Sebastián, July 2027",
            description: "Booking AV-0007 · The Calder family",
          },
        },
      },
    ])
  })

  it("leaves the payment methods to the Stripe dashboard", () => {
    expect(build()).not.toHaveProperty("payment_method_types")
  })

  it("ties the session and its payment intent back to the payment", () => {
    const params = build()
    const meta = {
      payment_id: view.payment.id,
      payment_link_id: view.link.id,
      booking_id: view.booking.id,
      booking_ref: "AV-0007",
    }
    expect(params.client_reference_id).toBe(view.payment.id)
    expect(params.metadata).toEqual(meta)
    expect(params.payment_intent_data).toEqual({
      metadata: meta,
      description: "AV-0007 · Deposit · San Sebastián, July 2027",
      receipt_email: "maya@example.com",
    })
  })

  it("creates a Stripe customer for a family without one", () => {
    const params = build()
    expect(params.customer_email).toBe("maya@example.com")
    expect(params.customer_creation).toBe("always")
    expect(params).not.toHaveProperty("customer")
  })

  it("reuses the family's Stripe customer when it has one", () => {
    const params = build({ stripeCustomerId: "cus_123" })
    expect(params.customer).toBe("cus_123")
    expect(params).not.toHaveProperty("customer_email")
    expect(params).not.toHaveProperty("customer_creation")
  })

  it("returns to the private page, and expires in two hours", () => {
    const params = build()
    expect(params.success_url).toBe(`https://avelune.example/pay/${token}?session_id={CHECKOUT_SESSION_ID}`)
    expect(params.cancel_url).toBe(`https://avelune.example/pay/${token}?cancelled=1`)
    expect(params.expires_at).toBe(1_800_000_000 + 7200)
    expect(params.submit_type).toBe("pay")
  })

  it("does not put the family's contact details or the token in the metadata", () => {
    const json = JSON.stringify(build().metadata)
    expect(json).not.toContain("maya@example.com")
    expect(json).not.toContain(token)
  })
})

describe("afterFailedExpire", () => {
  it("records a session that was paid while it was being replaced", () => {
    expect(afterFailedExpire({ status: "complete" })).toBe("fulfil")
  })

  it("never opens a second payable session beside one that is still open", () => {
    expect(afterFailedExpire({ status: "open" })).toBe("unavailable")
  })

  it("starts a new session once the old one is gone", () => {
    expect(afterFailedExpire({ status: "expired" })).toBe("create")
    expect(afterFailedExpire(null)).toBe("create")
  })
})

describe("isMissingCustomer", () => {
  it("recognises Stripe rejecting the saved customer", () => {
    expect(isMissingCustomer({ type: "StripeInvalidRequestError", code: "resource_missing", param: "customer" })).toBe(true)
  })

  it("leaves every other error alone", () => {
    expect(isMissingCustomer({ code: "resource_missing", param: "line_items" })).toBe(false)
    expect(isMissingCustomer({ code: "rate_limit" })).toBe(false)
    expect(isMissingCustomer(new Error("network"))).toBe(false)
    expect(isMissingCustomer(null)).toBe(false)
  })
})
