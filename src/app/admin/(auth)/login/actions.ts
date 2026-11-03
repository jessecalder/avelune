"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { adminConfigured } from "../../../../lib/admin/auth"
import { safeNextPath } from "../../../../lib/admin/next-path"
import { verifyPassword } from "../../../../lib/admin/password"
import {
  createSessionValue,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "../../../../lib/admin/session"
import { clientIp } from "../../../../lib/signups/client-ip"
import { createRateLimiter } from "../../../../lib/signups/rate-limit"
import { LOGIN_FIELDS, type LoginState } from "./state"

const WINDOW_MS = 15 * 60_000
const ipLimiter = createRateLimiter({ limit: 5, windowMs: WINDOW_MS })
// Caps wrong guesses from IP-rotating bots. Counts failures only; restarting the service clears it.
const globalFailures = createRateLimiter({ limit: 100, windowMs: WINDOW_MS })

const NOT_SET_UP = "Admin is not set up yet."
const WRONG = "That password is not right."
const THROTTLED = "Too many attempts. Try again in a few minutes."
const MAX_PASSWORD_LENGTH = 1024
const FAILURE_DELAY_MS = 400

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function login(prev: LoginState, formData: FormData): Promise<LoginState> {
  void prev
  if (!adminConfigured()) return { status: "error", message: NOT_SET_UP }

  const h = await headers()
  const ip = clientIp((name) => h.get(name))
  if (!ipLimiter.check(ip).ok || globalFailures.blocked("all")) {
    await sleep(FAILURE_DELAY_MS)
    return { status: "error", message: THROTTLED }
  }

  const password = formData.get(LOGIN_FIELDS.password)
  const next = safeNextPath(formData.get(LOGIN_FIELDS.next))
  const stored = process.env.ADMIN_PASSWORD_HASH ?? ""

  // Run the (slow) hash and the fixed delay together so a failure takes about the same time either way.
  const [ok] = await Promise.all([
    typeof password === "string" && password.length > 0 && password.length <= MAX_PASSWORD_LENGTH
      ? verifyPassword(password, stored)
      : Promise.resolve(false),
    sleep(FAILURE_DELAY_MS),
  ])
  if (!ok) {
    globalFailures.check("all")
    return { status: "error", message: WRONG }
  }

  ;(await cookies()).set(SESSION_COOKIE, createSessionValue(Date.now()), sessionCookieOptions())
  redirect(next)
}

/**
 * Clears the cookie. Needs no requireAdmin(): it reads no data and signing out while signed out
 * is harmless.
 */
export async function logout(): Promise<void> {
  ;(await cookies()).set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 })
  redirect("/admin/login")
}
