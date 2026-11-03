"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { site } from "@/content/site"
import { getDb } from "@/db/client"
import { bookings, interactions, paymentKind, payments } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"
import { formatMoney } from "@/lib/admin/format"
import {
  cents,
  date,
  dbMessage,
  failed,
  isUuid,
  oneOf,
  pacificEndOfDay,
  saved,
  text,
  type FormState,
} from "@/lib/admin/forms"
import { payUrl, siteUrl } from "@/lib/payments/config"
import { paymentEmailHtml } from "@/lib/payments/email"
import { isPayable, paymentTitle } from "@/lib/payments/state"
import {
  cancelLink,
  createLink,
  getActiveLink,
  getPayViewByLinkId,
  PaymentLinkError,
  recordEmailSent,
  type PayView,
} from "@/lib/payments/store"
import { emailSendingConfigured, sendEmail } from "@/lib/signups/email"

const CONSTRAINTS = {
  payments_amounts_check: "The amount must be more than zero.",
  payments_currency_check: "Currency must be a three-letter code such as usd or eur.",
  payments_booking_id_bookings_id_fk: "That booking no longer exists.",
  payment_links_payment_id_payments_id_fk: "That payment no longer exists.",
  payment_links_active_payment_idx: "That payment already has a live link. Reload the page and try again.",
  payment_links_token_idx: "Could not make a unique link. Try again.",
  interactions_family_id_families_id_fk: "That family no longer exists.",
  interactions_departure_id_departures_id_fk: "That trip no longer exists.",
}

// integer columns hold up to 2,147,483,647 cents.
const MAX_CENTS = 2_000_000_000
// Stripe will not take a payment below 50 cents.
const MIN_CENTS = 50
const MAX_SUBJECT = 200
const MAX_MESSAGE = 20_000

const NO_SITE_URL = "NEXT_PUBLIC_SITE_URL is not set, so a payment link can't be built. Set it, then try again."
const NO_RESEND =
  "Email sending isn't set up (Resend). Use “Open in email app”, then “I sent it myself”."

type Ctx = { paymentId: string; bookingId: string; familyId: string; departureId: string }

/** Every admin page that shows this payment, its booking, its family or the totals. */
function refresh(ctx: Ctx) {
  revalidatePath(`/admin/bookings/${ctx.bookingId}`)
  revalidatePath("/admin/payments")
  revalidatePath(`/admin/payments/${ctx.paymentId}`)
  revalidatePath(`/admin/families/${ctx.familyId}`)
  revalidatePath(`/admin/trips/${ctx.departureId}`)
  revalidatePath("/admin")
}

async function paymentContext(paymentId: string): Promise<Ctx | null> {
  const [row] = await getDb()
    .select({ bookingId: payments.bookingId, familyId: bookings.familyId, departureId: bookings.departureId })
    .from(payments)
    .innerJoin(bookings, eq(bookings.id, payments.bookingId))
    .where(eq(payments.id, paymentId))
    .limit(1)
  return row ? { paymentId, ...row } : null
}

function linkErrorMessage(err: PaymentLinkError): string {
  return err.code === "missing"
    ? "That payment no longer exists."
    : "This payment can't take a link any more: it is paid, refunded or closed, or its booking is cancelled."
}

/** Optional "link works until" date (Pacific): the link stays open through the end of that day. */
function readExpiry(fd: FormData): { ok: true; value: Date | null } | { ok: false; state: FormState } {
  const day = date(fd, "expires_on")
  if (day === undefined) return { ok: false, state: failed("“Link works until” isn't a valid date.", "expires_on") }
  if (day === null) return { ok: true, value: null }
  const end = pacificEndOfDay(day)
  if (Number.isNaN(end.getTime())) return { ok: false, state: failed("“Link works until” isn't a real date.", "expires_on") }
  if (end.getTime() <= Date.now()) {
    return { ok: false, state: failed("“Link works until” has to be today or later.", "expires_on") }
  }
  return { ok: true, value: end }
}

/** The public address is needed to build a link; without it the admin pages could not show one. */
function siteUrlSet(): boolean {
  try {
    siteUrl()
    return true
  } catch {
    return false
  }
}

/**
 * Booking page: creates a payment (status invoiced, method stripe) and its link, then goes to
 * /admin/payments/<id>. Fields: booking_id, kind, label?, amount, due_on, expires_on? (Pacific
 * date; the link works until the end of that day). The payment is in the booking's currency.
 */
export async function requestPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const bookingId = text(formData, "booking_id", 60)
  if (!isUuid(bookingId)) return failed("That booking could not be found.")

  const kind = oneOf(formData, "kind", paymentKind.enumValues)
  if (!kind) return failed("Choose what kind of payment this is.", "kind")

  const amountCents = cents(formData, "amount")
  if (amountCents === undefined) return failed("Amount must be an amount such as 2,500.00.", "amount")
  if (amountCents === null || amountCents <= 0) return failed("Enter an amount above zero.", "amount")
  if (amountCents > MAX_CENTS) return failed("Amount must be under 20 million.", "amount")

  const dueOn = date(formData, "due_on")
  if (dueOn === undefined) return failed("Due date isn't a valid date.", "due_on")
  if (dueOn === null) return failed("Enter the date this payment is due.", "due_on")

  const expiry = readExpiry(formData)
  if (!expiry.ok) return expiry.state
  if (!siteUrlSet()) return failed(NO_SITE_URL)

  let ctx: Ctx
  try {
    const db = getDb()
    const [booking] = await db
      .select({
        status: bookings.status,
        currency: bookings.currency,
        familyId: bookings.familyId,
        departureId: bookings.departureId,
      })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1)
    if (!booking) return failed("That booking no longer exists.")
    if (booking.status === "cancelled") {
      return failed("This booking is cancelled, so it can't take a new payment.")
    }
    if (amountCents < MIN_CENTS) {
      return failed(`Stripe can't take less than ${formatMoney(MIN_CENTS, booking.currency)}.`, "amount")
    }

    const [created] = await db
      .insert(payments)
      .values({
        bookingId,
        kind,
        label: text(formData, "label", 200),
        status: "invoiced",
        method: "stripe",
        amountCents,
        currency: booking.currency,
        dueOn,
      })
      .returning({ id: payments.id })
    try {
      await createLink(created.id, { expiresAt: expiry.value })
    } catch (err) {
      // No link, no payment: don't leave a row behind that nobody can pay.
      await db
        .delete(payments)
        .where(eq(payments.id, created.id))
        .catch((cleanup) => console.error("[payments] could not remove the unlinked payment:", cleanup))
      throw err
    }
    ctx = { paymentId: created.id, bookingId, familyId: booking.familyId, departureId: booking.departureId }
  } catch (err) {
    if (err instanceof PaymentLinkError) return failed(linkErrorMessage(err))
    return failed(dbMessage(err, CONSTRAINTS))
  }
  refresh(ctx)
  redirect(`/admin/payments/${ctx.paymentId}`)
}

/** Fields: payment_id, expires_on?. Makes the payment's link; any live link is replaced and stops working. */
export async function createPaymentLink(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const paymentId = text(formData, "payment_id", 60)
  if (!isUuid(paymentId)) return failed("That payment could not be found.")
  const expiry = readExpiry(formData)
  if (!expiry.ok) return expiry.state
  if (!siteUrlSet()) return failed(NO_SITE_URL)

  try {
    const ctx = await paymentContext(paymentId)
    if (!ctx) return failed("That payment no longer exists.")
    const earlier = await getActiveLink(paymentId)
    await createLink(paymentId, { expiresAt: expiry.value })
    refresh(ctx)
    return saved(earlier ? "New link ready. The earlier link no longer works." : "Payment link created.")
  } catch (err) {
    if (err instanceof PaymentLinkError) return failed(linkErrorMessage(err))
    return failed(dbMessage(err, CONSTRAINTS))
  }
}

/** Fields: link_id, payment_id. The link stops opening a payment page; an open checkout is expired. */
export async function cancelPaymentLink(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const linkId = text(formData, "link_id", 60)
  const paymentId = text(formData, "payment_id", 60)
  if (!isUuid(linkId) || !isUuid(paymentId)) return failed("That link could not be found.")

  try {
    const view = await getPayViewByLinkId(linkId)
    if (!view || view.payment.id !== paymentId) return failed("That link no longer exists.")
    if (view.link.cancelledAt) return failed("That link is already cancelled.")
    await cancelLink(linkId)
    refresh({
      paymentId,
      bookingId: view.booking.id,
      familyId: view.family.id,
      departureId: view.departure.id,
    })
    return saved(
      view.link.processingSince
        ? "Link cancelled. A bank payment was already clearing; it will still be recorded if it goes through."
        : "Link cancelled. It no longer opens a payment page.",
    )
  } catch (err) {
    return failed(dbMessage(err, CONSTRAINTS))
  }
}

function validEmail(v: string): boolean {
  return v.length <= 254 && z.email().safeParse(v).success
}

/** The recipient, one plain address (no names, lists or line breaks). */
function readRecipient(formData: FormData): { ok: true; to: string } | { ok: false; state: FormState } {
  const to = text(formData, "to", 400)
  if (to === null) return { ok: false, state: failed("Enter the email address to send it to.", "to") }
  if (!validEmail(to)) {
    return { ok: false, state: failed("That doesn't look like one email address. Use a single address.", "to") }
  }
  return { ok: true, to }
}

/**
 * The link must still be worth sending: this payment's own link, not cancelled or expired, on a
 * payment the family can still pay.
 */
async function loadSendable(formData: FormData): Promise<{ ok: true; view: PayView } | { ok: false; state: FormState }> {
  const paymentId = text(formData, "payment_id", 60)
  const linkId = text(formData, "link_id", 60)
  if (!isUuid(paymentId) || !isUuid(linkId)) return { ok: false, state: failed("That link could not be found.") }

  const view = await getPayViewByLinkId(linkId)
  if (!view || view.payment.id !== paymentId) {
    return { ok: false, state: failed("That link no longer exists. Reload the page.") }
  }
  if (view.link.cancelledAt) {
    return { ok: false, state: failed("That link was cancelled. Create a new one, then send it.") }
  }
  if (view.link.expiresAt && view.link.expiresAt.getTime() <= Date.now()) {
    return { ok: false, state: failed("That link has expired. Replace it with a new one, then send it.") }
  }
  if (view.booking.status === "cancelled") {
    return { ok: false, state: failed("This booking is cancelled, so the family can't pay through a link.") }
  }
  if (!isPayable(view.payment.status)) {
    const status = view.payment.status === "paid" ? "already paid" : view.payment.status
    return { ok: false, state: failed(`This payment is ${status}, so there is nothing to send.`) }
  }
  return { ok: true, view }
}

/** One line in the family's contact log, on the booking's trip. Never carries the link itself. */
async function logEmailed(view: PayView, to: string, byHand: boolean): Promise<void> {
  const what = `${paymentTitle(view.payment.kind, view.payment.label)} (${formatMoney(view.payment.amountCents, view.payment.currency)})`
  await getDb()
    .insert(interactions)
    .values({
      familyId: view.family.id,
      departureId: view.departure.id,
      kind: "email",
      summary: `Emailed the payment link for ${what} to ${to}.${byHand ? " Sent from a mail app and marked by hand." : ""}`,
    })
}

function recordedRefresh(view: PayView) {
  refresh({
    paymentId: view.payment.id,
    bookingId: view.booking.id,
    familyId: view.family.id,
    departureId: view.departure.id,
  })
}

function sendFailure(reason: string): string {
  switch (reason) {
    case "not-configured":
      return NO_RESEND
    case "timeout":
      return "The email service took too long to answer, so the email may not have gone out. Check Resend's log before sending it again."
    default:
      return "The email service refused it, so nothing was sent. Check the address and try again, or use “Open in email app”."
  }
}

/**
 * Fields: payment_id, link_id, to, subject, message. Sends the owner's (edited) message through
 * Resend with the contact address as Reply-To, marks the link emailed and logs an email entry
 * for the family. Refuses unless Resend is configured, the link is live and the payment still
 * payable, `to` is one valid address, the subject is a single line (200 characters at most) and
 * the message contains the link's own address.
 */
export async function sendPaymentEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const recipient = readRecipient(formData)
  if (!recipient.ok) return recipient.state
  const { to } = recipient

  const subject = text(formData, "subject", MAX_SUBJECT * 2)
  if (subject === null) return failed("Write a subject line.", "subject")
  if (/[\r\n]/.test(subject)) return failed("The subject has to be a single line.", "subject")
  if (subject.length > MAX_SUBJECT) return failed(`Keep the subject under ${MAX_SUBJECT} characters.`, "subject")

  // Browsers send line breaks as CRLF; the message is kept as plain LF text.
  const raw = text(formData, "message", MAX_MESSAGE + 1)
  if (raw === null) return failed("Write a message.", "message")
  if (raw.length > MAX_MESSAGE) return failed("The message is too long.", "message")
  const message = raw.replace(/\r\n?/g, "\n")

  if (!emailSendingConfigured()) return failed(NO_RESEND)

  let view: PayView
  try {
    const loaded = await loadSendable(formData)
    if (!loaded.ok) return loaded.state
    view = loaded.view
  } catch (err) {
    return failed(dbMessage(err, CONSTRAINTS))
  }

  const url = payUrl(view.link.token)
  if (!message.includes(url)) {
    return failed("The message has to include the payment link. Put it back, or copy it from the Payment link section.", "message")
  }

  const result = await sendEmail({
    to,
    subject,
    text: message,
    html: paymentEmailHtml(message, url),
    replyTo: site.contactEmail,
  })
  if (!result.sent) return failed(sendFailure(result.reason))

  try {
    await recordEmailSent(view.link.id, to)
    await logEmailed(view, to, false)
    recordedRefresh(view)
  } catch (err) {
    console.error("[payments] email sent but not recorded:", err)
    return failed(
      "The email went out, but I couldn't record it. Don't send it again: use “I sent it myself” to log it.",
    )
  }
  return saved(`Email sent to ${to}.`)
}

/**
 * Fields: payment_id, link_id, to. The owner sent the link from their own mail app: records the
 * send on the link and logs it for the family, with the same checks as sendPaymentEmail on the
 * link and the payment (no Resend needed).
 */
export async function markPaymentEmailSent(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin()
  const recipient = readRecipient(formData)
  if (!recipient.ok) return recipient.state
  const { to } = recipient

  try {
    const loaded = await loadSendable(formData)
    if (!loaded.ok) return loaded.state
    await recordEmailSent(loaded.view.link.id, to)
    await logEmailed(loaded.view, to, true)
    recordedRefresh(loaded.view)
  } catch (err) {
    return failed(dbMessage(err, CONSTRAINTS))
  }
  return saved(`Marked as sent to ${to}.`)
}
