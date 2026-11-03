import { afterEach, describe, expect, it, vi } from "vitest"
import { payUrl, paymentLinksConfigured, siteUrl, stripeTestMode } from "./config"

afterEach(() => vi.unstubAllEnvs())

function env(vars: Record<string, string>) {
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v)
}

describe("paymentLinksConfigured", () => {
  it("needs Stripe, the database and the site url", () => {
    env({ STRIPE_SECRET_KEY: "sk_test_x", DATABASE_URL: "postgres://x", NEXT_PUBLIC_SITE_URL: "https://avelune.example" })
    expect(paymentLinksConfigured()).toBe(true)
    for (const missing of ["STRIPE_SECRET_KEY", "DATABASE_URL", "NEXT_PUBLIC_SITE_URL"]) {
      env({ [missing]: "" })
      expect(paymentLinksConfigured(), missing).toBe(false)
      env({
        STRIPE_SECRET_KEY: "sk_test_x",
        DATABASE_URL: "postgres://x",
        NEXT_PUBLIC_SITE_URL: "https://avelune.example",
      })
    }
  })

  it("does not count a site url that is only slashes", () => {
    env({ STRIPE_SECRET_KEY: "sk_test_x", DATABASE_URL: "postgres://x", NEXT_PUBLIC_SITE_URL: "//" })
    expect(paymentLinksConfigured()).toBe(false)
  })
})

describe("stripeTestMode", () => {
  it("recognises test secret and restricted keys only", () => {
    env({ STRIPE_SECRET_KEY: "sk_test_abc" })
    expect(stripeTestMode()).toBe(true)
    env({ STRIPE_SECRET_KEY: "rk_test_abc" })
    expect(stripeTestMode()).toBe(true)
    env({ STRIPE_SECRET_KEY: "sk_live_abc" })
    expect(stripeTestMode()).toBe(false)
    env({ STRIPE_SECRET_KEY: "" })
    expect(stripeTestMode()).toBe(false)
  })
})

describe("siteUrl and payUrl", () => {
  it("strips trailing slashes", () => {
    env({ NEXT_PUBLIC_SITE_URL: "https://avelune.example///" })
    expect(siteUrl()).toBe("https://avelune.example")
    expect(payUrl("tok")).toBe("https://avelune.example/pay/tok")
  })

  it("throws when unset", () => {
    env({ NEXT_PUBLIC_SITE_URL: "" })
    expect(() => siteUrl()).toThrow("NEXT_PUBLIC_SITE_URL")
    expect(() => payUrl("tok")).toThrow()
  })
})
