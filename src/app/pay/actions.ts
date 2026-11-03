"use server"

import { createHash } from "node:crypto"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { site } from "@/content/site"
import { startCheckout, type StartCheckoutResult } from "@/lib/payments/checkout"
import { isLinkToken } from "@/lib/payments/token"
import { clientIp } from "@/lib/signups/client-ip"
import { createRateLimiter } from "@/lib/signups/rate-limit"
import { PAY_FIELDS, type PayState } from "./types"

const limiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 })
// Caps Checkout Sessions opened by IP-rotating bots; a real family needs one or two.
const globalLimiter = createRateLimiter({ limit: 200, windowMs: 10 * 60_000 })

const UNAVAILABLE: PayState = { status: "error", message: site.pay.unavailable }

/**
 * The Pay button: opens (or reuses) a Stripe Checkout Session for the link and sends the family
 * there. When the payment changed since the page loaded, the client reloads it instead.
 */
export async function startPaymentCheckout(prev: PayState, formData: FormData): Promise<PayState> {
  void prev
  const raw = formData.get(PAY_FIELDS.token)
  const token = typeof raw === "string" ? raw : ""
  if (!isLinkToken(token)) return UNAVAILABLE

  // redirect() works by throwing, so it must stay outside the try/catch below.
  let result: StartCheckoutResult
  try {
    const h = await headers()
    const ip = clientIp((name) => h.get(name))
    const ipKey = createHash("sha256")
      .update(ip + "|" + (process.env.SIGNUP_IP_SALT ?? "avelune"))
      .digest("hex")
      .slice(0, 32)
    if (!limiter.check(ipKey).ok || !globalLimiter.check("all").ok) {
      return { status: "error", message: site.pay.rateLimited }
    }
    result = await startCheckout(token)
  } catch (err) {
    console.error("[payments] startPaymentCheckout failed:", err)
    return UNAVAILABLE
  }

  if (result.ok) redirect(result.url)
  switch (result.reason) {
    case "paid":
    case "processing":
    case "inactive":
      return { status: "refresh" }
    case "not-found":
    case "unavailable":
      return UNAVAILABLE
  }
}
