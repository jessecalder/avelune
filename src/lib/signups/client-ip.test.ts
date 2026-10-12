import { describe, expect, it } from "vitest"
import { clientIp } from "./client-ip"

const h = (o: Record<string, string>) => (n: string) => o[n] ?? null

describe("clientIp", () => {
  it("ignores a spoofed leftmost X-Forwarded-For entry", () => {
    expect(clientIp(h({ "x-forwarded-for": "10.0.0.7, 203.0.113.9" }), {})).toBe("203.0.113.9")
  })
  it("honours extra trusted hops", () => {
    expect(
      clientIp(h({ "x-forwarded-for": "6.6.6.6, 203.0.113.9, 172.16.0.1" }), {
        SIGNUP_TRUSTED_PROXY_HOPS: "2",
      }),
    ).toBe("203.0.113.9")
  })
  it("uses x-real-ip on Vercel and falls back to unknown", () => {
    expect(clientIp(h({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" }), { VERCEL: "1" })).toBe("1.2.3.4")
    expect(clientIp(h({}), {})).toBe("unknown")
  })
})
