/**
 * The email that carries a private payment link: a plain draft the owner can edit before it
 * goes, and the HTML wrapper for whatever text finally goes out. The draft names the family's
 * payment and the journey, never the children or anyone's email.
 */
import type { Payment } from "../../db/schema"
import { formatMoney } from "../admin/format"
import { paymentWord } from "./state"

export type PaymentEmailInput = {
  familyName: string
  primaryContactName: string | null
  departureName: string
  startsOn: string
  endsOn: string
  bookingRef: string
  kind: Payment["kind"]
  label: string | null
  amountCents: number
  currency: string
  dueOn: string
  url: string
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function ymd(day: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!match) return null
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? { y, m, d } : null
}

/** "2026-11-17" → "November 17, 2026"; the text as given when it is not a date. */
function proseDay(day: string): string {
  const p = ymd(day)
  return p ? `${MONTHS[p.m - 1]} ${p.d}, ${p.y}` : day
}

/** "July 10 to 19, 2027", "July 28 to August 6, 2027", "December 28, 2026 to January 6, 2027". */
function proseRange(start: string, end: string): string {
  const a = ymd(start)
  const b = ymd(end)
  if (!a || !b) return `${start} to ${end}`
  if (a.y !== b.y) return `${proseDay(start)} to ${proseDay(end)}`
  if (a.m !== b.m) return `${MONTHS[a.m - 1]} ${a.d} to ${MONTHS[b.m - 1]} ${b.d}, ${a.y}`
  if (a.d === b.d) return proseDay(start)
  return `${MONTHS[a.m - 1]} ${a.d} to ${b.d}, ${a.y}`
}

/** One line: typed labels and names can carry stray line breaks. */
function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim()
}

/** Same rule as the welcome email: only a plain first name reaches the greeting. */
function greeting(name: string | null): string {
  const first = name?.trim().split(/\s+/)[0] ?? ""
  return /^[\p{L}\p{M}’'-]{1,30}$/u.test(first) ? `Dear ${first},` : "Hello,"
}

/** The subject and plain-text body the owner starts from; both are editable before sending. */
export function paymentEmailDraft(input: PaymentEmailInput): { subject: string; text: string } {
  const word = oneLine(paymentWord(input.kind, input.label))
  const journey = oneLine(input.departureName)
  const text = [
    greeting(input.primaryContactName),
    `Here is the private payment link for your family's ${word} for ${journey} (${proseRange(input.startsOn, input.endsOn)}), booking ${oneLine(input.bookingRef)}.`,
    `Amount: ${formatMoney(input.amountCents, input.currency)}\nDue by: ${proseDay(input.dueOn)}`,
    input.url,
    "The link opens a short page with the details; the payment itself is handled by Stripe. It is private to your family, so please don't forward it.",
    "If anything is unclear, just reply. It comes straight to me.",
    "Jesse\nAvelune",
  ].join("\n\n")
  return { subject: `Your ${word} for ${journey}`, text }
}

const INK = "#1A1A1A"
const BONE = "#F4F1EA"
const STONE = "#6E6A63"
const MIST = "#DCD6CA"
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** Only a web address becomes a button or a link; anything else stays plain text. */
function isWebUrl(s: string): boolean {
  return /^https?:\/\/[^\s"'<>]+$/i.test(s)
}

function paragraphHtml(raw: string, link: string | null): string {
  const style = `margin:0 0 18px;font-size:16px;line-height:1.7;color:${INK};`
  if (link !== null && raw === link) {
    return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 12px;"><tr><td bgcolor="${INK}" style="background:${INK};"><a href="${esc(link)}" style="display:inline-block;padding:16px 36px;font-family:${FONT};font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:${BONE};text-decoration:none;">Pay securely</a></td></tr></table>
<p style="margin:0 0 22px;font-size:12px;line-height:1.6;color:${STONE};word-break:break-all;">${esc(link)}</p>`
  }
  let body = esc(raw).replace(/\n/g, "<br>")
  if (link !== null) {
    // The address inside a longer paragraph still opens.
    const anchor = `<a href="${esc(link)}" style="color:${INK};text-decoration:underline;word-break:break-all;">${esc(link)}</a>`
    body = body.split(esc(link)).join(anchor)
  }
  return `<p style="${style}">${body}</p>`
}

/**
 * The final (possibly edited) message as an HTML email in the site's register: bone paper, ink
 * text, a tracked AVELUNE header. Paragraphs split on blank lines, single line breaks stay,
 * everything is escaped, and a paragraph that is only the payment link becomes a button.
 */
export function paymentEmailHtml(text: string, url: string): string {
  const link = isWebUrl(url.trim()) ? url.trim() : null
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== "")
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Avelune</title>
</head>
<body style="margin:0;padding:0;background:${BONE};color:${INK};font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BONE}" style="background:${BONE};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:0 0 24px;border-bottom:1px solid ${MIST};font-size:13px;letter-spacing:0.28em;color:${INK};">AVELUNE</td></tr>
<tr><td style="padding:32px 0 0;font-family:${FONT};color:${INK};">
${paragraphs.map((p) => paragraphHtml(p, link)).join("\n")}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
