import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { connection } from "next/server"
import { SESSION_COOKIE, sessionSecret, verifySessionValue } from "./session"

/**
 * Owner auth. The proxy (src/proxy.ts) is only the first gate: every admin server component that
 * reads data and every admin server action must call requireAdmin() itself, close to the data.
 *
 * Today there is one owner and no user id. To add Clerk or several users later, change what
 * isAdmin() checks (and have requireAdmin return the user); callers already go through it.
 */

/** Admin exists only when both the password hash and a long-enough session secret are set. */
export function adminConfigured(env: Record<string, string | undefined> = process.env): boolean {
  const hash = env.ADMIN_PASSWORD_HASH
  return typeof hash === "string" && hash.trim().length > 0 && sessionSecret(env) !== null
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(SESSION_COOKIE)?.value
  // partialPrefetching renders with cookies but still forbids reading the clock; connection()
  // stops every prerender (runtime prefetches included) before Date.now().
  await connection()
  if (!adminConfigured()) return false
  return verifySessionValue(value, Date.now())
}

export async function requireAdmin(): Promise<void> {
  const jar = await cookies()
  await connection() // see isAdmin()
  if (!adminConfigured()) notFound()
  if (!verifySessionValue(jar.get(SESSION_COOKIE)?.value, Date.now())) redirect("/admin/login")
}
