import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, verifySessionValue } from "./lib/admin/session"
import { linkTokenExists } from "./lib/payments/lookup"

/**
 * First gate for /admin (Node runtime, the default). It checks the signed cookie and sends
 * everyone else to the login page. It is not the only gate: admin pages and server actions call
 * requireAdmin() themselves (src/lib/admin/auth.ts).
 */
function adminGate(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isLogin = pathname === "/admin/login" || pathname === "/admin/login/"

  let response: NextResponse
  if (isLogin || verifySessionValue(request.cookies.get(SESSION_COOKIE)?.value, Date.now())) {
    response = NextResponse.next()
  } else {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/login"
    url.search = ""
    if (pathname !== "/admin" && pathname !== "/admin/") url.searchParams.set("next", pathname)
    response = NextResponse.redirect(url)
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow")
  response.headers.set("Cache-Control", "no-store")
  return response
}

const PAY_PATH = /^\/pay\/([^/]+)\/?$/

/**
 * /pay/<token> streams its body, so by the time the page finds no link it has already answered
 * 200. The 404 is decided here instead: a malformed or unknown token is rewritten to /pay/missing,
 * a prerendered page that renders the same not-found UI under a real 404 status. The page still checks
 * for itself, and when the database can't be asked here the request is left to it.
 */
/** How long the gate waits for the database before leaving the request to the page (which still checks). */
const LOOKUP_TIMEOUT_MS = 2000

async function payGate(request: NextRequest) {
  const segment = PAY_PATH.exec(request.nextUrl.pathname)?.[1]
  if (segment === undefined) return NextResponse.next()
  let exists: boolean
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    // Tokens are base64url, so a percent-encoded segment is never one. Bounded, so a database that
    // hangs costs the family the 404 status at worst, not a blank screen while the page waits too.
    exists = await Promise.race([
      linkTokenExists(segment),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("link lookup timed out")), LOOKUP_TIMEOUT_MS)
      }),
    ])
  } catch (err) {
    // The driver's message, not Drizzle's wrapper: that one prints the query's parameters, the token among them.
    const message = err instanceof Error ? (err.cause instanceof Error ? err.cause.message : err.message) : "unknown error"
    console.error("[payments] proxy could not look up a link:", message)
    return NextResponse.next()
  } finally {
    clearTimeout(timer)
  }
  if (exists) return NextResponse.next()
  const url = request.nextUrl.clone()
  url.pathname = "/pay/missing"
  url.search = ""
  return NextResponse.rewrite(url)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  return pathname === "/pay" || pathname.startsWith("/pay/") ? payGate(request) : adminGate(request)
}

export const config = {
  matcher: ["/admin/:path*", "/pay/:path*"],
}
