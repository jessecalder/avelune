/**
 * The post-login destination comes from a query string / hidden field, so treat it as hostile:
 * only same-site paths under /admin, never "//", a backslash, a control character or a scheme.
 */
export function safeNextPath(raw: unknown, fallback = "/admin"): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 512) return fallback
  if (!(raw === "/admin" || raw.startsWith("/admin/") || raw.startsWith("/admin?"))) return fallback
  if (raw.includes("//") || raw.includes("\\")) return fallback
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) < 0x20 || raw.charCodeAt(i) === 0x7f) return fallback
  }
  let normalized: string
  try {
    const u = new URL(raw, "http://admin.invalid")
    if (u.origin !== "http://admin.invalid") return fallback
    if (u.pathname !== "/admin" && !u.pathname.startsWith("/admin/")) return fallback
    if (u.pathname === "/admin/login" || u.pathname.startsWith("/admin/login/")) return fallback
    // The parser percent-encodes non-ASCII; returning raw would put an invalid char in the Location header.
    normalized = u.pathname + u.search
  } catch {
    return fallback
  }
  return normalized
}
