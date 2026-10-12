/**
 * Best-effort client IP from headers a client cannot choose. Proxies append to
 * X-Forwarded-For, so the leftmost entry is attacker-controlled; take the entry
 * added by our own edge instead, counting SIGNUP_TRUSTED_PROXY_HOPS (default 1)
 * from the right. On Vercel, x-real-ip is overwritten by the platform.
 */
export function clientIp(
  get: (name: string) => string | null,
  env: Record<string, string | undefined> = process.env,
): string {
  if (env.VERCEL) {
    const v = get("x-real-ip")?.trim()
    if (v) return v
  }
  const hops = Math.max(1, Number.parseInt(env.SIGNUP_TRUSTED_PROXY_HOPS ?? "1", 10) || 1)
  const parts = (get("x-forwarded-for") ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
  if (parts.length > 0) return parts[Math.max(0, parts.length - hops)]
  return get("x-real-ip")?.trim() || "unknown"
}
