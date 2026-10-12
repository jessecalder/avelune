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

const NOW = new Date("2026-10-11T12:00:00.000Z")
const ev = (id: string, type: string, object: object) =>
  ({ id, type, data: { object } }) as unknown as Stripe.Event

function deps(store: WebhookDeps["store"]): WebhookDeps {
  return { store, now: () => NOW, holdDays: 14 }
}

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
      ev("evt_6", "charge.refunded", { id: "ch_6", refunded: false, payment_intent: "pi_6" }),
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
    })
    await expect(handleStripeEvent(refund, deps(none))).rejects.toThrow("no reservation")
    expect(await none.recordEvent("evt_m", "charge.refunded")).toBe(true)
  })
})
