import { Resend } from "resend"
import { welcomeEmail } from "../../content/email"

export type EmailResult = { sent: true } | { sent: false; reason: string }

const TIMEOUT_MS = 6000

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Resend is set up: an API key and a From address. */
export function emailSendingConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM
}

/**
 * Sends one email through Resend from EMAIL_FROM, giving up after a few seconds. Never throws:
 * the result says whether it went and, if not, why ("not-configured", "provider-error",
 * "timeout", "error").
 */
export async function sendEmail(message: {
  to: string
  subject: string
  text: string
  html: string
  replyTo?: string
}): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from) return { sent: false, reason: "not-configured" }

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)
    })
    const result = await Promise.race([
      new Resend(key).emails.send({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      }),
      timeout,
    ])
    if (result.error) {
      console.error("[email] send failed:", result.error)
      return { sent: false, reason: "provider-error" }
    }
    return { sent: true }
  } catch (err) {
    console.error("[email] send failed:", err)
    const reason = err instanceof Error && err.message === "timeout" ? "timeout" : "error"
    return { sent: false, reason }
  } finally {
    clearTimeout(timer)
  }
}

export async function sendWelcomeEmail(args: {
  to: string
  name?: string
}): Promise<EmailResult> {
  return sendEmail({
    to: args.to,
    subject: welcomeEmail.subject,
    text: welcomeEmail.text(args.name),
    html: welcomeEmail.html(args.name),
  })
}

export async function notifyOwner(args: {
  email: string
  name?: string
  source?: string
}): Promise<EmailResult> {
  const to = process.env.SIGNUP_NOTIFY_EMAIL
  if (!to) return { sent: false, reason: "not-configured" }
  const line = `New Avelune signup: ${args.email}${args.name ? ` (${args.name})` : ""}${
    args.source ? ` via ${args.source}` : ""
  }`
  return sendEmail({
    to,
    subject: "New Avelune signup",
    text: line,
    html: `<p>${esc(line)}</p>`,
  })
}
