"use client"

/**
 * STUB — batch F1 replaces this file entirely. It exists so other batches can
 * import { SignupForm } with the agreed props while F1 is in progress.
 */
import { JOIN_FIELDS } from "@/lib/signups/types"

export type SignupFormProps = {
  /** Which form on the page sent the signup: stored with the row. */
  source: "hero" | "founding" | "closing"
  /** Surface the form sits on; controls field and button colours. */
  variant: "dark" | "light"
  cta: string
  microcopy: string
  className?: string
}

export function SignupForm({ source, cta, className = "" }: SignupFormProps) {
  return (
    <form className={className}>
      <input type="hidden" name={JOIN_FIELDS.source} value={source} />
      <input type="email" name={JOIN_FIELDS.email} />
      <button type="submit">{cta}</button>
    </form>
  )
}
