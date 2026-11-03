import type Stripe from "stripe"
import { describe, expect, it } from "vitest"
import { handleStripeEvent, type WebhookDeps } from "./webhook"

function fakeStore() {
  const seen = new Set<string>()
  const calls: Array<[string, unknown]> = []
  const store: WebhookDeps["store"] = {
    recordEvent: async (id) => {
      if (seen.has(id)) return false
      seen.add(id)
      return true
    },
    forgetEvent: async (id) => {
      seen.delete(id)
    },
    markPaid: async (args) => {
      calls.push(["markPaid", args])
      return "updated"
    },
    markExpired: async (id) => {
      calls.push(["markExpired", id])
    },
    markRefunded: async (args) => {
      calls.push(["markRefunded", args])
      return "updated"
    },
  }
  return { store, calls }
}

type Outcomes = {
  fulfil?: Awaited<ReturnType<WebhookDeps["payments"]["fulfilCheckoutSession"]>>
  fail?: Awaited<ReturnType<WebhookDeps["payments"]["failAsyncPayment"]>>
  refund?: Awaited<ReturnType<WebhookDeps["payments"]["applyRefund"]>>
}

/** Payment-link functions that record their calls and answer with the given outcomes. */
function fakePayments(outcomes: Outcomes = {}) {
  const calls: Array<[string, unknown]> = []
  const payments: WebhookDeps["payments"] = {
    fulfilCheckoutSession: async (session) => {
      calls.push(["fulfilCheckoutSession", session.id])
      return outcomes.fulfil ?? "paid"
    },
    failAsyncPayment: async (session) => {
      calls.push(["failAsyncPayment", session.id])
      return outcomes.fail ?? "updated"
    },
    applyRefund: async (charge) => {
      calls.push(["applyRefund", charge.id])
      return outcomes.refund ?? "updated"
    },
    sessionExpired: async (session) => {
      calls.push(["sessionExpired", session.id])
    },
  }
  return { payments, calls }
}

const NOW = new Date("2026-10-11T12:00:00.000Z")
const ev = (id: string, type: string, object: object) =>
  ({ id, type, data: { object } }) as unknown as Stripe.Event

function deps(store: WebhookDeps["store"], payments = fakePayments().payments): WebhookDeps {
  return { store, payments, now: () => NOW, holdDays: 14 }
}

const PAYMENT_ID = "6f1d2c3b-4a59-4e8d-9b7c-0a1b2c3d4e5f"
const LINK_ID = "0b9f5d52-8d3c-4a57-9a0e-3f1f6a1d2c11"
const linkMeta = { payment_id: PAYMENT_ID, payment_link_id: LINK_ID }

describe("handleStripeEvent", () => {
  it("marks a paid checkout session paid with a hold window", async () => {
    const { store, calls } = fakeStore()
    const result = await handleStripeEvent(
      ev("evt_1", "checkout.session.completed", {
        id: "cs_1",
        payment_status: "paid",
        payment_intent: "pi_1",
        customer: null,
      }),
      deps(store),
    )
    expect(result).toEqual({ handled: true })
    expect(calls).toEqual([
      [
        "markPaid",
        {
          sessionId: "cs_1",
          paymentIntentId: "pi_1",
          customerId: null,
          holdExpiresAt: new Date("2026-10-25T12:00:00.000Z"),
        },
      ],
    ])
  })

  it("does nothing for a completed session that is not paid", async () => {
    const { store, calls } = fakeStore()
    const result = await handleStripeEvent(
      ev("evt_2", "checkout.session.completed", { id: "cs_2", payment_status: "unpaid" }),
      deps(store),
    )
    expect(result).toEqual({ handled: false, reason: "not-paid" })
    expect(calls).toEqual([])
  })

  it("skips an event it has already seen", async () => {
    const { store, calls } = fakeStore()
    const event = ev("evt_3", "checkout.session.expired", { id: "cs_3" })
    expect(await handleStripeEvent(event, deps(store))).toEqual({ handled: true })
    expect(await handleStripeEvent(event, deps(store))).toEqual({
      handled: false,
      reason: "duplicate",
    })
    expect(calls).toHaveLength(1)
  })

  it("marks an expired session expired", async () => {
    const { store, calls } = fakeStore()
    await handleStripeEvent(ev("evt_4", "checkout.session.expired", { id: "cs_4" }), deps(store))
    expect(calls).toEqual([["markExpired", "cs_4"]])
  })

  it("marks a fully refunded charge refunded by payment intent", async () => {
    const { store, calls } = fakeStore()
    const result = await handleStripeEvent(
      ev("evt_5", "charge.refunded", {
        id: "ch_5",
        refunded: true,
        payment_intent: "pi_5",
        metadata: { reservationId: "0b9f5d52-8d3c-4a57-9a0e-3f1f6a1d2c11" },
      }),
      deps(store),
    )
    expect(result).toEqual({ handled: true })
    expect(calls).toEqual([
      [
        "markRefunded",
        { paymentIntentId: "pi_5", reservationId: "0b9f5d52-8d3c-4a57-9a0e-3f1f6a1d2c11" },
      ],
    ])
  })

  it("ignores partial refunds", async () => {
    const { store, calls } = fakeStore()
    const result = await handleStripeEvent(
      ev("evt_6", "charge.refunded", {
        id: "ch_6",
        refunded: false,
        payment_intent: "pi_6",
        metadata: { reservationId: "0b9f5d52-8d3c-4a57-9a0e-3f1f6a1d2c11" },
      }),
      deps(store),
    )
    expect(result).toEqual({ handled: false, reason: "partial-refund" })
    expect(calls).toEqual([])
  })

  it("ignores unknown event types without recording them", async () => {
    const { store } = fakeStore()
    const result = await handleStripeEvent(ev("evt_7", "customer.created", {}), deps(store))
    expect(result).toEqual({ handled: false, reason: "ignored" })
    expect(await store.recordEvent("evt_7", "customer.created")).toBe(true)
  })

  it("lets a retry through when the handler failed", async () => {
    const { store } = fakeStore()
    let fail = true
    const flaky: WebhookDeps["store"] = {
      ...store,
      markExpired: async () => {
        if (fail) throw new Error("db down")
      },
    }
    const event = ev("evt_8", "checkout.session.expired", { id: "cs_8" })
    await expect(handleStripeEvent(event, deps(flaky))).rejects.toThrow("db down")
    fail = false
    expect(await handleStripeEvent(event, deps(flaky))).toEqual({ handled: true })
  })
  it("never resurrects a refunded deposit when a completion event arrives late", async () => {
    // Mirrors the store's guards: only pending can become paid; refund matches by id too.
    const row = { status: "pending" as "pending" | "paid" | "refunded", pi: null as string | null }
    const { store } = fakeStore()
    const stateful: WebhookDeps["store"] = {
      ...store,
      markRefunded: async (a) => {
        if (row.status === "refunded") return "unchanged"
        if (row.pi !== a.paymentIntentId && !a.reservationId) return "missing"
        row.status = "refunded"
        return "updated"
      },
      markPaid: async (a) => {
        if (row.status !== "pending") return "unchanged"
        row.status = "paid"
        row.pi = a.paymentIntentId
        return "updated"
      },
    }
    const refund = ev("evt_r", "charge.refunded", {
      id: "ch_r",
      refunded: true,
      payment_intent: "pi_r",
      metadata: { reservationId: "0b9f5d52-8d3c-4a57-9a0e-3f1f6a1d2c11" },
    })
    const completed = ev("evt_c", "checkout.session.completed", {
      id: "cs_r",
      payment_status: "paid",
      payment_intent: "pi_r",
    })
    expect(await handleStripeEvent(refund, deps(stateful))).toEqual({ handled: true })
    expect(await handleStripeEvent(completed, deps(stateful))).toEqual({
      handled: false,
      reason: "stale",
    })
    expect(row.status).toBe("refunded")
  })

  it("fails (so Stripe retries) when a refund matches no reservation yet", async () => {
    const { store } = fakeStore()
    const none: WebhookDeps["store"] = { ...store, markRefunded: async () => "missing" }
    const refund = ev("evt_m", "charge.refunded", {
      id: "ch_m",
      refunded: true,
      payment_intent: "pi_m",
      metadata: { reservationId: "0b9f5d52-8d3c-4a57-9a0e-3f1f6a1d2c11" },
    })
    await expect(handleStripeEvent(refund, deps(none))).rejects.toThrow("no reservation")
    expect(await none.recordEvent("evt_m", "charge.refunded")).toBe(true)
  })
})

describe("handleStripeEvent: payment links", () => {
  const completed = (over: object = {}) =>
    ev("evt_p1", "checkout.session.completed", {
      id: "cs_p1",
      payment_status: "paid",
      payment_intent: "pi_p1",
      customer: "cus_1",
      metadata: linkMeta,
      ...over,
    })

  it("records a completed payment-link session and leaves the reservation store alone", async () => {
    const { store, calls } = fakeStore()
    const pay = fakePayments({ fulfil: "paid" })
    expect(await handleStripeEvent(completed(), deps(store, pay.payments))).toEqual({ handled: true })
    expect(pay.calls).toEqual([["fulfilCheckoutSession", "cs_p1"]])
    expect(calls).toEqual([])
  })

  it("treats a bank payment that is clearing, and a second payment, as handled", async () => {
    for (const outcome of ["processing", "extra"] as const) {
      const { store } = fakeStore()
      const pay = fakePayments({ fulfil: outcome })
      expect(await handleStripeEvent(completed({ id: `cs_${outcome}` }), deps(store, pay.payments))).toEqual({
        handled: true,
      })
    }
  })

  it("does not fail when the payment is not in this database", async () => {
    const { store } = fakeStore()
    const pay = fakePayments({ fulfil: "missing" })
    expect(await handleStripeEvent(completed(), deps(store, pay.payments))).toEqual({
      handled: false,
      reason: "missing",
    })
    // Recorded, so Stripe is not asked to retry something that will never apply here.
    expect(await store.recordEvent("evt_p1", "checkout.session.completed")).toBe(false)
  })

  it("logs live money that lands on no payment, and stays quiet in test mode", async () => {
    const errors: unknown[][] = []
    const original = console.error
    console.error = (...args: unknown[]) => void errors.push(args)
    try {
      const pay = fakePayments({ fulfil: "missing" })
      await handleStripeEvent(completed({ livemode: false }), deps(fakeStore().store, pay.payments))
      expect(errors).toHaveLength(0)
      const live = await handleStripeEvent(completed({ id: "cs_live", livemode: true }), deps(fakeStore().store, pay.payments))
      expect(live).toEqual({ handled: false, reason: "missing" })
      expect(String(errors[0]?.[0])).toContain("live checkout session cs_live")
    } finally {
      console.error = original
    }
  })

  it("reports a repeat and an unreadable session without handling them", async () => {
    for (const outcome of ["unchanged", "ignored"] as const) {
      const { store } = fakeStore()
      const pay = fakePayments({ fulfil: outcome })
      expect(await handleStripeEvent(completed(), deps(store, pay.payments))).toEqual({
        handled: false,
        reason: outcome,
      })
    }
  })

  it("lets a retry through when recording the payment failed", async () => {
    const { store } = fakeStore()
    const { payments } = fakePayments()
    let fail = true
    const flaky: WebhookDeps["payments"] = {
      ...payments,
      fulfilCheckoutSession: async () => {
        if (fail) throw new Error("db down")
        return "paid"
      },
    }
    await expect(handleStripeEvent(completed(), deps(store, flaky))).rejects.toThrow("db down")
    fail = false
    expect(await handleStripeEvent(completed(), deps(store, flaky))).toEqual({ handled: true })
  })

  it("does not record the same event twice", async () => {
    const { store } = fakeStore()
    const pay = fakePayments()
    await handleStripeEvent(completed(), deps(store, pay.payments))
    expect(await handleStripeEvent(completed(), deps(store, pay.payments))).toEqual({
      handled: false,
      reason: "duplicate",
    })
    expect(pay.calls).toHaveLength(1)
  })

  it("records a bank payment that cleared", async () => {
    const { store } = fakeStore()
    const pay = fakePayments({ fulfil: "paid" })
    const event = ev("evt_a1", "checkout.session.async_payment_succeeded", {
      id: "cs_a1",
      payment_status: "paid",
      metadata: linkMeta,
    })
    expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({ handled: true })
    expect(pay.calls).toEqual([["fulfilCheckoutSession", "cs_a1"]])
  })

  it("ignores a cleared bank payment that is not for a payment link", async () => {
    const { store, calls } = fakeStore()
    const pay = fakePayments()
    const event = ev("evt_a2", "checkout.session.async_payment_succeeded", {
      id: "cs_a2",
      payment_status: "paid",
      metadata: { reservationId: LINK_ID },
    })
    expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({ handled: false, reason: "not-ours" })
    expect(pay.calls).toEqual([])
    expect(calls).toEqual([])
  })

  it("lets the link work again after a failed bank payment", async () => {
    const { store } = fakeStore()
    const pay = fakePayments({ fail: "updated" })
    const event = ev("evt_f1", "checkout.session.async_payment_failed", { id: "cs_f1", metadata: linkMeta })
    expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({ handled: true })
    expect(pay.calls).toEqual([["failAsyncPayment", "cs_f1"]])
  })

  it("reports a failure that changed nothing", async () => {
    const { store } = fakeStore()
    const pay = fakePayments({ fail: "unchanged" })
    const event = ev("evt_f2", "checkout.session.async_payment_failed", { id: "cs_f2", metadata: linkMeta })
    expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({ handled: false, reason: "unchanged" })
  })

  it("ignores a failed bank payment that is not for a payment link", async () => {
    const { store } = fakeStore()
    const pay = fakePayments()
    const event = ev("evt_f3", "checkout.session.async_payment_failed", { id: "cs_f3", metadata: {} })
    expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({ handled: false, reason: "not-ours" })
    expect(pay.calls).toEqual([])
  })

  it("clears an expired payment-link session without touching reservations", async () => {
    const { store, calls } = fakeStore()
    const pay = fakePayments()
    const event = ev("evt_x1", "checkout.session.expired", { id: "cs_x1", metadata: linkMeta })
    expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({ handled: true })
    expect(pay.calls).toEqual([["sessionExpired", "cs_x1"]])
    expect(calls).toEqual([])
  })

  it("still expires a reservation session when there is no payment id", async () => {
    const { store, calls } = fakeStore()
    const pay = fakePayments()
    const event = ev("evt_x2", "checkout.session.expired", { id: "cs_x2", metadata: { reservationId: LINK_ID } })
    expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({ handled: true })
    expect(calls).toEqual([["markExpired", "cs_x2"]])
    expect(pay.calls).toEqual([])
  })

  describe("refunds", () => {
    const refund = (id: string, over: object = {}) =>
      ev(id, "charge.refunded", { id: `ch_${id}`, refunded: true, payment_intent: "pi_r", metadata: {}, ...over })

    it("applies a refund to the payment that holds the intent", async () => {
      const { store, calls } = fakeStore()
      const pay = fakePayments({ refund: "updated" })
      expect(await handleStripeEvent(refund("evt_r1"), deps(store, pay.payments))).toEqual({ handled: true })
      expect(pay.calls).toEqual([["applyRefund", "ch_evt_r1"]])
      expect(calls).toEqual([])
    })

    it("passes partial refunds on: the payment records the amount", async () => {
      const { store } = fakeStore()
      const pay = fakePayments({ refund: "updated" })
      const event = refund("evt_r2", { refunded: false, amount_refunded: 2500, metadata: linkMeta })
      expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({ handled: true })
      expect(pay.calls).toEqual([["applyRefund", "ch_evt_r2"]])
    })

    it("reports a refund that is already recorded", async () => {
      const { store } = fakeStore()
      const pay = fakePayments({ refund: "unchanged" })
      expect(await handleStripeEvent(refund("evt_r3"), deps(store, pay.payments))).toEqual({
        handled: false,
        reason: "unchanged",
      })
    })

    it("sends reservation refunds down the reservation path only", async () => {
      const { store, calls } = fakeStore()
      const pay = fakePayments()
      const event = refund("evt_r4", { metadata: { reservationId: LINK_ID } })
      expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({ handled: true })
      expect(calls).toEqual([["markRefunded", { paymentIntentId: "pi_r", reservationId: LINK_ID }]])
      expect(pay.calls).toEqual([])
    })

    it("fails so Stripe retries when the payment is here but its completion is not recorded yet", async () => {
      const { store } = fakeStore()
      const pay = fakePayments({ refund: "pending" })
      const event = refund("evt_r5", { metadata: linkMeta })
      await expect(handleStripeEvent(event, deps(store, pay.payments))).rejects.toThrow("has no record of charge")
      expect(await store.recordEvent("evt_r5", "charge.refunded")).toBe(true)
    })

    it("lets a refund go whose payment is not in this database (another environment, a deleted payment)", async () => {
      const { store } = fakeStore()
      const pay = fakePayments({ refund: "missing" })
      const event = refund("evt_r5b", { metadata: linkMeta })
      expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({
        handled: false,
        reason: "unknown-charge",
      })
      expect(await store.recordEvent("evt_r5b", "charge.refunded")).toBe(false)
    })

    it("lets a charge nobody here knows go", async () => {
      const { store } = fakeStore()
      const pay = fakePayments({ refund: "missing" })
      expect(await handleStripeEvent(refund("evt_r6"), deps(store, pay.payments))).toEqual({
        handled: false,
        reason: "unknown-charge",
      })
      expect(await store.recordEvent("evt_r6", "charge.refunded")).toBe(false)
    })

    it("does not retry forever over a payment id that is not a uuid", async () => {
      const { store } = fakeStore()
      const pay = fakePayments({ refund: "missing" })
      const event = refund("evt_r7", { metadata: { payment_id: "not-a-uuid" } })
      expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({
        handled: false,
        reason: "unknown-charge",
      })
    })
  })

  it("ignores the other event types and never touches payments for them", async () => {
    const { store } = fakeStore()
    const pay = fakePayments()
    const event = ev("evt_o1", "payment_intent.succeeded", { id: "pi_o1", metadata: linkMeta })
    expect(await handleStripeEvent(event, deps(store, pay.payments))).toEqual({ handled: false, reason: "ignored" })
    expect(pay.calls).toEqual([])
  })
})
