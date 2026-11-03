import { describe, expect, it } from "vitest"
import { isLinkToken, newLinkToken } from "./token"

describe("newLinkToken", () => {
  it("is 43 base64url characters", () => {
    for (let i = 0; i < 50; i++) expect(newLinkToken()).toMatch(/^[A-Za-z0-9_-]{43}$/)
  })

  it("is different every time", () => {
    const seen = new Set(Array.from({ length: 200 }, () => newLinkToken()))
    expect(seen.size).toBe(200)
  })

  it("passes its own check", () => {
    expect(isLinkToken(newLinkToken())).toBe(true)
  })
})

describe("isLinkToken", () => {
  const good = "A".repeat(43)

  it("accepts exactly 43 url-safe characters", () => {
    expect(isLinkToken(good)).toBe(true)
    expect(isLinkToken("a-_".repeat(14) + "a")).toBe(true)
  })

  it("rejects the wrong length", () => {
    expect(isLinkToken(good.slice(1))).toBe(false)
    expect(isLinkToken(good + "A")).toBe(false)
    expect(isLinkToken("")).toBe(false)
  })

  it("rejects other characters, including padding and newlines", () => {
    expect(isLinkToken(good.slice(1) + "=")).toBe(false)
    expect(isLinkToken(good.slice(1) + "+")).toBe(false)
    expect(isLinkToken(good.slice(1) + "/")).toBe(false)
    expect(isLinkToken(good.slice(1) + "\n")).toBe(false)
    expect(isLinkToken(good + "\n")).toBe(false)
  })

  it("rejects non-strings", () => {
    expect(isLinkToken(undefined)).toBe(false)
    expect(isLinkToken(null)).toBe(false)
    expect(isLinkToken(42)).toBe(false)
    expect(isLinkToken(["A".repeat(43)])).toBe(false)
  })
})
