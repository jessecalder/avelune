import { describe, expect, it } from "vitest"
import { createRateLimiter } from "./rate-limit"

describe("createRateLimiter", () => {
  it("blocks after the limit and recovers once the window rolls over", () => {
    let t = 1_000
    const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t })

    expect(rl.check("a").ok).toBe(true)
    t += 100
    expect(rl.check("a").ok).toBe(true)
    t += 100
    const blocked = rl.check("a")
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterMs).toBe(800)

    t += 800
    expect(rl.check("a").ok).toBe(true)
  })

  it("tracks keys independently", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 })
    expect(rl.check("a").ok).toBe(true)
    expect(rl.check("b").ok).toBe(true)
    expect(rl.check("a").ok).toBe(false)
  })

  it("does not count blocked attempts against the window", () => {
    let t = 0
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t })
    rl.check("a")
    t = 900
    expect(rl.check("a").ok).toBe(false)
    t = 1001
    expect(rl.check("a").ok).toBe(true)
  })

  it("caps tracked keys, dropping the oldest", () => {
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => 0 })
    for (let i = 0; i < 10_001; i++) rl.check(`k${i}`)
    // k0 was evicted so it is allowed again; the newest key is still limited.
    expect(rl.check("k0").ok).toBe(true)
    expect(rl.check("k10000").ok).toBe(false)
  })
})
