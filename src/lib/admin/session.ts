import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Stateless owner session: base64url(JSON {v, iat, exp}) + "." + base64url(HMAC-SHA256(secret, payload)).
 * Pure Node code (no next imports) so the proxy, server actions and tests can all use it.
 * Times are milliseconds since the epoch; callers pass the clock in.
 */

export const SESSION_COOKIE = "avelune_admin"
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000
export const SESSION_VERSION = 1
export const MIN_SECRET_LENGTH = 32

/** The signing secret, or null when missing or too short (admin is then disabled). */
export function sessionSecret(env: Record<string, string | undefined> = process.env): string | null {
  const s = env.ADMIN_SESSION_SECRET
  return typeof s === "string" && s.length >= MIN_SECRET_LENGTH ? s : null
}

function mac(secret: string, payload: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest()
}

export function createSessionValue(now: number, secret: string | null = sessionSecret()): string {
  if (!secret || secret.length < MIN_SECRET_LENGTH) throw new Error("ADMIN_SESSION_SECRET is missing or shorter than 32 characters.")
  const payload = Buffer.from(JSON.stringify({ v: SESSION_VERSION, iat: now, exp: now + SESSION_TTL_MS })).toString("base64url")
  return `${payload}.${mac(secret, payload).toString("base64url")}`
}

export function verifySessionValue(value: string | undefined | null, now: number, secret: string | null = sessionSecret()): boolean {
  try {
    if (!value || !secret || secret.length < MIN_SECRET_LENGTH) return false
    const parts = value.split(".")
    if (parts.length !== 2) return false
    const [payload, sig] = parts
    const given = Buffer.from(sig, "base64url")
    const expected = mac(secret, payload)
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false
    const data: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (typeof data !== "object" || data === null) return false
    const { v, iat, exp } = data as Record<string, unknown>
    if (v !== SESSION_VERSION) return false
    if (typeof iat !== "number" || typeof exp !== "number") return false
    if (!Number.isFinite(iat) || !Number.isFinite(exp)) return false
    if (exp - iat > SESSION_TTL_MS) return false
    return now < exp
  } catch {
    return false
  }
}

export function sessionCookieOptions(env: Record<string, string | undefined> = process.env) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/admin",
    maxAge: SESSION_TTL_MS / 1000,
  }
}
