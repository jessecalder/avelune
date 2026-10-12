"use server"

import { createHash } from "node:crypto"
import { headers } from "next/headers"
import { notifyOwner, sendWelcomeEmail } from "../../lib/signups/email"
import { clientIp } from "../../lib/signups/client-ip"
import { createRateLimiter } from "../../lib/signups/rate-limit"
import {
  enrichSchema,
  isDisposableEmail,
  joinSchema,
  normalizeEmail,
} from "../../lib/signups/schema"
import { getStore } from "../../lib/signups/store"
import {
  CONSENT_TEXT_VERSION,
  ENRICH_FIELDS,
  JOIN_FIELDS,
  type EnrichState,
  type JoinState,
} from "../../lib/signups/types"

const joinLimiter = createRateLimiter({ limit: 6, windowMs: 10 * 60_000 })
// Not client-keyable: caps total inserts/emails even if per-IP keys are rotated.
const globalJoinLimiter = createRateLimiter({ limit: 60, windowMs: 10 * 60_000 })
const enrichLimiter = createRateLimiter({ limit: 10, windowMs: 10 * 60_000 })

const GENERIC_ERROR = "Something went wrong on our side. Please try again."

function field(formData: FormData, name: string): string | undefined {
  const v = formData.get(name)
  return typeof v === "string" ? v : undefined
}

async function requestMeta() {
  const h = await headers()
  const ip = clientIp((name) => h.get(name))
  const ipHash = createHash("sha256")
    .update(ip + "|" + (process.env.SIGNUP_IP_SALT ?? "avelune"))
    .digest("hex")
    .slice(0, 32)
  return {
    ipHash,
    userAgent: h.get("user-agent")?.slice(0, 300) || undefined,
    referer: h.get("referer")?.slice(0, 500) || undefined,
  }
}

export async function joinEarlyAccess(
  prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  void prev
  try {
    // Bots that fill the honeypot see success but nothing is stored and no token is issued.
    if ((field(formData, JOIN_FIELDS.honeypot) ?? "").trim() !== "") {
      return { status: "already" }
    }

    const parsed = joinSchema.safeParse({
      email: field(formData, JOIN_FIELDS.email),
      name: field(formData, JOIN_FIELDS.name),
      source: field(formData, JOIN_FIELDS.source),
      utm: field(formData, JOIN_FIELDS.utm),
      referrer: field(formData, JOIN_FIELDS.referrer),
    })
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const key = issue?.path[0]
      if (key === "name") {
        return { status: "error", field: "name", message: issue.message }
      }
      return {
        status: "error",
        field: "email",
        message: key === "email" ? issue.message : "Enter a valid email address.",
      }
    }
    const input = parsed.data
    const { email, emailKey } = normalizeEmail(input.email)

    if (isDisposableEmail(emailKey)) {
      return {
        status: "error",
        field: "email",
        message: "Please use an email address you’ll keep.",
      }
    }

    const meta = await requestMeta()
    if (!joinLimiter.check(meta.ipHash).ok || !globalJoinLimiter.check("global").ok) {
      return {
        status: "error",
        message: "Too many attempts from this network. Try again in a few minutes.",
      }
    }

    const result = await getStore().insert({
      email,
      emailKey,
      name: input.name,
      source: input.source,
      referrer: input.referrer || meta.referer,
      utm: input.utm,
      landingPath: "/",
      consentVersion: CONSENT_TEXT_VERSION,
      ipHash: meta.ipHash,
      userAgent: meta.userAgent,
    })
    if (!result.created) return { status: "already" }

    await Promise.allSettled([
      sendWelcomeEmail({ to: email, name: input.name }),
      notifyOwner({ email, name: input.name, source: input.source }),
    ])
    return { status: "joined", token: result.token }
  } catch (err) {
    console.error("[signups] joinEarlyAccess failed:", err)
    return { status: "error", message: GENERIC_ERROR }
  }
}

export async function enrichSignup(
  prev: EnrichState,
  formData: FormData,
): Promise<EnrichState> {
  void prev
  try {
    const parsed = enrichSchema.safeParse({
      token: field(formData, ENRICH_FIELDS.token),
      childrenCount: field(formData, ENRICH_FIELDS.childrenCount),
      childrenAges: field(formData, ENRICH_FIELDS.childrenAges),
      destinations: formData
        .getAll(ENRICH_FIELDS.destinations)
        .filter((v): v is string => typeof v === "string"),
      notes: field(formData, ENRICH_FIELDS.notes),
    })
    if (!parsed.success) {
      return {
        status: "error",
        message: "Please check the details you entered and try again.",
      }
    }
    const { token, ...patch } = parsed.data

    const meta = await requestMeta()
    if (!enrichLimiter.check(meta.ipHash).ok) {
      return {
        status: "error",
        message: "Too many attempts from this network. Try again in a few minutes.",
      }
    }

    const ok = await getStore().enrich(token, patch)
    if (!ok) {
      return {
        status: "error",
        message: "We couldn’t find that signup. Please sign up again.",
      }
    }
    return { status: "saved" }
  } catch (err) {
    console.error("[signups] enrichSignup failed:", err)
    return { status: "error", message: GENERIC_ERROR }
  }
}
