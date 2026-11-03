"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useTransition } from "react"
import { startPaymentCheckout } from "../actions"
import { PAY_FIELDS, PAY_INITIAL } from "../types"

/** The charcoal Pay button. Opens Stripe's checkout; if the payment changed meanwhile, reloads the page. */
export function PayButton({ token, label, pendingLabel }: { token: string; label: string; pendingLabel: string }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(startPaymentCheckout, PAY_INITIAL)
  const [refreshing, startRefresh] = useTransition()
  const busy = pending || refreshing

  useEffect(() => {
    if (state.status === "refresh") startRefresh(() => router.refresh())
  }, [state, router])

  // Coming back from Stripe with the browser's Back button can restore this page mid-submit.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload()
    }
    window.addEventListener("pageshow", onShow)
    return () => window.removeEventListener("pageshow", onShow)
  }, [])

  return (
    <form action={formAction}>
      <input type="hidden" name={PAY_FIELDS.token} value={token} />
      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className="group inline-flex h-14 w-full items-center justify-center gap-3 rounded-none bg-ember px-6 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-bone transition-colors hover:bg-ember-deep disabled:opacity-70"
      >
        {busy ? pendingLabel : label}
        <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </button>
      {state.status === "error" ? (
        <p role="alert" className="mt-3 text-center text-[0.8125rem] leading-[1.5] text-ink">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
