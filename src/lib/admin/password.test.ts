import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword } from "./password"

describe("admin password hashing", () => {
  it("round-trips and uses the documented format", async () => {
    const stored = await hashPassword("correct horse battery staple")
    expect(stored).toMatch(/^scrypt:32768:8:1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/)
    expect(stored).not.toContain("$")
    expect(await verifyPassword("correct horse battery staple", stored)).toBe(true)
  })

  it("salts every hash", async () => {
    const a = await hashPassword("same password, twice")
    const b = await hashPassword("same password, twice")
    expect(a).not.toBe(b)
  })

  it("rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse battery staple")
    expect(await verifyPassword("correct horse battery stapl", stored)).toBe(false)
    expect(await verifyPassword("", stored)).toBe(false)
  })

  it("rejects a tampered hash", async () => {
    const stored = await hashPassword("correct horse battery staple")
    const parts = stored.split(":")
    const hash = parts[5]
    parts[5] = (hash[0] === "A" ? "B" : "A") + hash.slice(1)
    expect(await verifyPassword("correct horse battery staple", parts.join(":"))).toBe(false)
    const truncated = [...stored.split(":").slice(0, 5), hash.slice(0, 40)].join(":")
    expect(await verifyPassword("correct horse battery staple", truncated)).toBe(false)
  })

  it("returns false, never throws, on malformed input", async () => {
    const bad = [
      "",
      "not a hash",
      "scrypt:1:2:3",
      "bcrypt:32768:8:1:c2FsdHNhbHRzYWx0:aGFzaGhhc2hoYXNoaGFzaA",
      "scrypt:abc:8:1:c2FsdHNhbHRzYWx0:aGFzaGhhc2hoYXNoaGFzaA",
      "scrypt:32767:8:1:c2FsdHNhbHRzYWx0:aGFzaGhhc2hoYXNoaGFzaA",
      "scrypt:4294967296:8:1:c2FsdHNhbHRzYWx0:aGFzaGhhc2hoYXNoaGFzaA",
      "scrypt:32768:8:1:!!!:???",
      "scrypt:32768:8:1::",
      "scrypt:32768:8:1:c2FsdHNhbHRzYWx0:aGFzaGhhc2hoYXNoaGFzaA:extra",
    ]
    for (const stored of bad) {
      expect(await verifyPassword("anything", stored)).toBe(false)
    }
    expect(await verifyPassword("anything", undefined as unknown as string)).toBe(false)
  })
})
