"use client"

import { startTransition, useActionState, useRef, useState, type FormEvent } from "react"
import { TextArea, TextField } from "@/components/admin/fields"
import { BUTTON_CLASS, BUTTON_QUIET_CLASS, Notice } from "@/components/admin/kit"
import { markPaymentEmailSent, sendPaymentEmail } from "@/lib/admin/actions/payment-links"
import { FORM_IDLE, type FormState } from "@/lib/admin/forms"
import { CopyButton } from "./CopyButton"

type Fields = { to: string; subject: string; message: string }

/** A mail-app link built from what is in the boxes right now. Line breaks go as CRLF, as mail clients expect. */
function mailtoHref({ to, subject, message }: Fields): string {
  const address = encodeURIComponent(to.trim()).replace(/%40/g, "@")
  const body = encodeURIComponent(message.replace(/\r?\n/g, "\r\n"))
  return `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${body}`
}

function Line({ state, failure }: { state: FormState; failure: string }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="text-[0.875rem] text-ink">
        <span className="font-medium">{failure}</span> {state.message}
      </p>
    )
  }
  if (state.status === "saved") {
    return (
      <p role="status" className="text-[0.875rem] text-stone">
        {state.message ?? "Done."}
      </p>
    )
  }
  return null
}

/**
 * The email that carries a payment link: To, Subject and Message are all editable. With Resend
 * set up it sends from here; either way the owner can open it in their own mail app, copy it,
 * and mark it sent by hand so the status and the family's log stay right.
 */
export function PaymentEmailComposer({
  paymentId,
  linkId,
  url,
  defaultTo,
  defaultSubject,
  defaultText,
  canSend,
  fromLabel,
}: {
  paymentId: string
  linkId: string
  url: string
  defaultTo: string
  defaultSubject: string
  defaultText: string
  canSend: boolean
  fromLabel: string
}) {
  const [fields, setFields] = useState<Fields>({ to: defaultTo, subject: defaultSubject, message: defaultText })
  const [sendState, sendAction, sending] = useActionState(sendPaymentEmail, FORM_IDLE)
  const [markState, markAction, marking] = useActionState(markPaymentEmailSent, FORM_IDLE)
  const formRef = useRef<HTMLFormElement>(null)

  const hasLink = fields.message.includes(url)

  // The boxes are uncontrolled (the shared field components are); this keeps a copy for the mail-app link.
  const onInput = (e: FormEvent<HTMLFormElement>) => {
    const t = e.target
    if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return
    if (t.name === "to" || t.name === "subject" || t.name === "message") {
      const name = t.name
      setFields((f) => ({ ...f, [name]: t.value }))
    }
  }

  // Submitted by hand, as ActionForm does, so React doesn't reset the boxes after a failed send.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!canSend || sending) return
    // Also stops Enter in a text box from sending an email by accident.
    if (!window.confirm(`Email this payment link to ${fields.to.trim() || "this address"}?`)) return
    const data = new FormData(e.currentTarget)
    startTransition(() => sendAction(data))
  }

  const markSent = () => {
    const data = new FormData()
    data.set("payment_id", paymentId)
    data.set("link_id", linkId)
    data.set("to", fields.to)
    startTransition(() => markAction(data))
  }

  return (
    <div>
      {canSend ? null : (
        <div className="mb-6 max-w-[70ch]">
          <Notice>
            Sending from here needs Resend (RESEND_API_KEY and EMAIL_FROM), and it isn&apos;t set up. Use &ldquo;Open in
            email app&rdquo; or copy the message, send it yourself, then press &ldquo;I sent it myself&rdquo; so the status
            and the family&apos;s log stay right.
          </Notice>
        </div>
      )}
      <form ref={formRef} onSubmit={onSubmit} onInput={onInput}>
        <input type="hidden" name="payment_id" value={paymentId} />
        <input type="hidden" name="link_id" value={linkId} />
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <TextField name="to" label="To" type="email" required defaultValue={defaultTo} maxLength={254} />
          <TextField name="subject" label="Subject" required defaultValue={defaultSubject} maxLength={200} wide />
          <TextArea
            name="message"
            label="Message"
            required
            rows={16}
            defaultValue={defaultText}
            hint="The payment link has to stay in the message. Edit anything else."
          />
        </div>

        {hasLink ? null : (
          <p role="alert" className="mt-4 text-[0.875rem] text-ink">
            <span className="font-medium">The payment link is no longer in the message.</span> Put it back before sending.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {canSend ? (
            <button type="submit" disabled={sending || !hasLink} aria-busy={sending} className={BUTTON_CLASS}>
              {sending ? "Sending" : "Send email"}
            </button>
          ) : null}
          <a href={mailtoHref(fields)} className={canSend ? BUTTON_QUIET_CLASS : BUTTON_CLASS}>
            Open in email app
          </a>
          <CopyButton
            text={fields.message}
            label="Copy message"
            select={() => {
              const box = formRef.current?.elements.namedItem("message")
              return box instanceof HTMLTextAreaElement ? box : null
            }}
          />
          <button type="button" onClick={markSent} disabled={marking} aria-busy={marking} className={BUTTON_QUIET_CLASS}>
            I sent it myself
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <Line state={sendState} failure="Not sent." />
          <Line state={markState} failure="Not recorded." />
          <p className="text-[0.8125rem] text-stone">
            {canSend ? `Sends from ${fromLabel}; replies go to the contact address. ` : null}
            Sent it from your own mail app? Press &ldquo;I sent it myself&rdquo; to record it.
          </p>
        </div>
      </form>
    </div>
  )
}
