"use server"

import { createHash } from "node:crypto"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { depositsEnabled, depositTerms, JOURNEYS } from "../../lib/deposits/config"
import {
  attachCheckoutSession,
  createReservation,
  findSignupIdByToken,
} from "../../lib/deposits/store"
import {
  DEPOSIT_FIELDS,
  JOURNEY_IDS,
  type DepositState,
} from "../../lib/deposits/types"
import { clientIp } from "../../lib/signups/client-ip"
import { createRateLimiter } from "../../lib/signups/rate-limit"
import { normalizeEmail } from "../../lib/signups/schema"
import { getStripe } from "../../lib/stripe"

const limiter = createRateLimiter({ limit: 5, windowMs: 10 * 60_000 })
// Caps reservation rows and Checkout Sessions created by IP-rotating bots.
const globalLimiter = createRateLimiter({ limit: 60, windowMs: 10 * 60_000 })

const GENERIC_ERROR = "Something went wrong on our side. Please try again."
const EMAIL_ERROR = "Enter a valid email address."

const inputSchema = z.object({
  email: z
    .string({ error: EMAIL_ERROR })
    .trim()
    .max(254, { error: EMAIL_ERROR })
    .pipe(z.email({ error: EMAIL_ERROR })),
  journey: z.enum(JOURNEY_IDS, { error: "Choose a journey." }),
  token: z
    .string()
    .regex(/^[a-f0-9]{48}$/)
    .optional(),
})

function field(formData: FormData, name: string): string | undefined {
  const v = formData.get(name)
  return typeof v === "string" && v !== "" ? v : undefined
}

export async function createDepositCheckout(
  prev: DepositState,
  formData: FormData,
): Promise<DepositState> {
  void prev
  if (!depositsEnabled()) return { status: "closed" }

  const parsed = inputSchema.safeParse({
    email: field(formData, DEPOSIT_FIELDS.email),
    journey: field(formData, DEPOSIT_FIELDS.journey),
    token: field(formData, DEPOSIT_FIELDS.token),
  })
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? EMAIL_ERROR }
  }
  const { journey, token } = parsed.data
  const { email, emailKey } = normalizeEmail(parsed.data.email)

  // redirect() works by throwing, so it must stay outside the try/catch below.
  let checkoutUrl: string
  try {
    const h = await headers()
    const ip = clientIp((name) => h.get(name))
    const ipKey = createHash("sha256")
      .update(ip + "|" + (process.env.SIGNUP_IP_SALT ?? "avelune"))
      .digest("hex")
      .slice(0, 32)
    if (!limiter.check(ipKey).ok || !globalLimiter.check("all").ok) {
      return {
        status: "error",
        message: "Too many attempts from this network. Try again in a few minutes.",
      }
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "")
    if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL is not set")

    const terms = depositTerms()
    const signupId = token ? await findSignupIdByToken(token) : undefined
    const reservation = await createReservation({
      signupId: signupId ?? null,
      email,
      emailKey,
      journey,
      amountCents: terms.amountCents,
      currency: terms.currency,
    })

    const metadata = { reservationId: reservation.id, journey }
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      // Delayed-notification methods (bank debits) would need async_payment_* handling.
      allowed_payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: terms.currency,
            unit_amount: terms.amountCents,
            product_data: {
              name: `Avelune founding-family deposit — ${JOURNEYS[journey].label}, ${JOURNEYS[journey].window}`,
              description: `Fully refundable for ${terms.holdDays} days.`,
            },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata },
      success_url: `${siteUrl}/deposit/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/deposit/cancelled`,
    })
    if (!session.url) throw new Error("Stripe returned a Checkout Session without a url")
    await attachCheckoutSession(reservation.id, session.id)
    checkoutUrl = session.url
  } catch (err) {
    console.error("[deposits] createDepositCheckout failed:", err)
    return { status: "error", message: GENERIC_ERROR }
  }

  redirect(checkoutUrl)
}
