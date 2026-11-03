import { describe, expect, it } from "vitest"
import {
  createSessionValue,
  sessionCookieOptions,
  sessionSecret,
  SESSION_TTL_MS,
  verifySessionValue,
} from "./session"

const SECRET = "x".repeat(40)
const T0 = 1_800_000_000_000

describe("admin session cookie", () => {
  it("verifies a fresh value", () => {
    const v = createSessionValue(T0, SECRET)
    expect(verifySessionValue(v, T0, SECRET)).toBe(true)
    expect(verifySessionValue(v, T0 + SESSION_TTL_MS - 1, SECRET)).toBe(true)
  })

  it("expires after twelve hours", () => {
    const v = createSessionValue(T0, SECRET)
    expect(verifySessionValue(v, T0 + SESSION_TTL_MS, SECRET)).toBe(false)
    expect(verifySessionValue(v, T0 + SESSION_TTL_MS + 1000, SECRET)).toBe(false)
  })

  it("rejects a different secret", () => {
    const v = createSessionValue(T0, SECRET)
    expect(verifySessionValue(v, T0, "y".repeat(40))).toBe(false)
  })

  it("rejects a tampered payload or signature", () => {
    const v = createSessionValue(T0, SECRET)
    const [payload, sig] = v.split(".")
    const forged = Buffer.from(JSON.stringify({ v: 1, iat: T0, exp: T0 + 10 * SESSION_TTL_MS })).toString("base64url")
    expect(verifySessionValue(`${forged}.${sig}`, T0, SECRET)).toBe(false)
    expect(verifySessionValue(`${payload}.${sig.slice(0, -2)}AA`, T0, SECRET)).toBe(false)
    expect(verifySessionValue(`${payload}.`, T0, SECRET)).toBe(false)
  })

  it("rejects a wrong version even when correctly signed", async () => {
    const { createHmac } = await import("node:crypto")
    const payload = Buffer.from(JSON.stringify({ v: 2, iat: T0, exp: T0 + 1000 })).toString("base64url")
    const sig = createHmac("sha256", SECRET).update(payload).digest("base64url")
    expect(verifySessionValue(`${payload}.${sig}`, T0, SECRET)).toBe(false)
  })

  it("rejects malformed values and a missing secret", () => {
    for (const bad of ["", "abc", "a.b.c", ".", "..", undefined, null]) {
      expect(verifySessionValue(bad, T0, SECRET)).toBe(false)
    }
    const v = createSessionValue(T0, SECRET)
    expect(verifySessionValue(v, T0, null)).toBe(false)
    expect(verifySessionValue(v, T0, "short")).toBe(false)
  })

  it("refuses to sign without a proper secret", () => {
    expect(() => createSessionValue(T0, null)).toThrow()
    expect(() => createSessionValue(T0, "short")).toThrow()
  })

  it("reads the secret only when it is at least 32 characters", () => {
    expect(sessionSecret({})).toBeNull()
    expect(sessionSecret({ ADMIN_SESSION_SECRET: "a".repeat(31) })).toBeNull()
    expect(sessionSecret({ ADMIN_SESSION_SECRET: "a".repeat(32) })).toBe("a".repeat(32))
  })

  it("sets the documented cookie options", () => {
    expect(sessionCookieOptions({ NODE_ENV: "production" })).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/admin",
      maxAge: 43_200,
    })
    expect(sessionCookieOptions({ NODE_ENV: "development" }).secure).toBe(false)
  })
})
