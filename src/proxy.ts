import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, verifySessionValue } from "./lib/admin/session"

/**
 * First gate for /admin only (Node runtime, the default). It checks the signed cookie and sends
 * everyone else to the login page. It is not the only gate: admin pages and server actions call
 * requireAdmin() themselves (src/lib/admin/auth.ts).
 */
export function proxy(request: NextRequest) {
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

export const config = {
  matcher: ["/admin/:path*"],
}
