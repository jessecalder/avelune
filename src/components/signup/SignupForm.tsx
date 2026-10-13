"use client"

import { useActionState, useId, useSyncExternalStore } from "react"
import { joinEarlyAccess } from "@/app/actions/early-access"
import { site } from "@/content/site"
import { JOIN_FIELDS, JOIN_INITIAL } from "@/lib/signups/types"
import { readClientMeta } from "./client-meta"
import { SignupSuccess } from "./SignupSuccess"

export type SignupFormProps = {
  /** Which form on the page sent the signup: stored with the row. */
  source: "hero" | "founding" | "closing"
  /** Surface the form sits on; controls field and button colours. */
  variant: "dark" | "light"
  cta: string
  microcopy: string
  className?: string
}

const noopSubscribe = () => () => {}

export function SignupForm({ source, variant, cta, microcopy, className = "" }: SignupFormProps) {
  const [state, formAction, pending] = useActionState(joinEarlyAccess, JOIN_INITIAL)
  const uid = useId()
  const emailId = `${uid}-email`
  const microId = `${uid}-micro`
  const errorId = `${uid}-error`
  // Empty on the server and during hydration, real values afterwards.
  const utm = useSyncExternalStore(noopSubscribe, () => readClientMeta().utm, () => "")
  const referrer = useSyncExternalStore(noopSubscribe, () => readClientMeta().referrer, () => "")
  const dark = variant === "dark"

  if (state.status === "joined") {
    return (
      <div className={className}>
        <SignupSuccess token={state.token} variant={variant} />
      </div>
    )
  }

  if (state.status === "already") {
    return (
      <div className={`animate-fade ${className}`} role="status">
        <p
          className={`font-display text-[1.75rem] leading-[1.1] ${dark ? "text-bone" : "text-ink"}`}
        >
          {site.signup.already.headline}
        </p>
        <p className={`mt-3 text-[1.0625rem] leading-[1.55] ${dark ? "text-bone/90" : "text-ink"}`}>
          {site.signup.already.body}
        </p>
      </div>
    )
  }

  const hasError = state.status === "error"
  const inputCls = dark
    ? "border-moon/60 text-bone placeholder:text-bone/50 focus:border-moon"
    : "border-ink/25 text-ink placeholder:text-stone focus:border-ink"

  return (
    <form action={formAction} className={className}>
      <input type="hidden" name={JOIN_FIELDS.source} value={source} />
      <input type="hidden" name={JOIN_FIELDS.utm} value={utm} />
      <input type="hidden" name={JOIN_FIELDS.referrer} value={referrer} />
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name={JOIN_FIELDS.honeypot} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="sm:flex-1">
          <label className="sr-only" htmlFor={emailId}>
            {site.signup.emailLabel}
          </label>
          <input
            id={emailId}
            type="email"
            name={JOIN_FIELDS.email}
            required
            autoComplete="email"
            inputMode="email"
            placeholder={site.signup.emailPlaceholder}
            aria-invalid={hasError}
            aria-describedby={hasError ? `${errorId} ${microId}` : microId}
            className={`h-14 w-full border bg-transparent px-4 focus:outline-none ${inputCls}`}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="group inline-flex h-14 w-full items-center justify-center gap-3 bg-ember px-6 font-medium text-bone transition-colors hover:bg-ember-deep disabled:opacity-70 sm:w-auto"
        >
          {pending ? site.signup.submitting : cta}
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>

      {hasError ? (
        <p id={errorId} role="alert" className={`mt-3 text-[0.8125rem] leading-[1.5] ${dark ? "text-moon" : "text-ember"}`}>
          {state.message}
        </p>
      ) : null}
      <p id={microId} className={`mt-3 text-[0.8125rem] leading-[1.5] ${dark ? "text-bone/70" : "text-stone"}`}>
        {microcopy}
      </p>
    </form>
  )
}
