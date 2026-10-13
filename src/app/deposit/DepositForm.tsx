"use client"

import { useActionState, useId } from "react"
import { createDepositCheckout } from "@/app/actions/deposits"
import { FORM_LIGHT, MICRO_CLASS } from "@/components/maison/primitives"
import { site } from "@/content/site"
import { DEPOSIT_FIELDS, DEPOSIT_INITIAL } from "@/lib/deposits/types"

export type DepositJourneyOption = { id: string; label: string; window: string }

export function DepositForm({
  journeys,
  token,
}: {
  journeys: DepositJourneyOption[]
  token?: string
}) {
  const [state, formAction, pending] = useActionState(createDepositCheckout, DEPOSIT_INITIAL)
  const uid = useId()
  const emailId = `${uid}-email`
  const microId = `${uid}-micro`
  const errorId = `${uid}-error`
  const hasError = state.status === "error"

  if (state.status === "closed") {
    return <p role="status">{site.deposit.closed}</p>
  }

  return (
    <form action={formAction} className={`${FORM_LIGHT} [&_p]:text-left! space-y-10`}>
      {token ? <input type="hidden" name={DEPOSIT_FIELDS.token} value={token} /> : null}

      <div>
        <label htmlFor={emailId} className={`${MICRO_CLASS} mb-3 block text-stone`}>
          {site.deposit.emailLabel}
        </label>
        <input
          id={emailId}
          type="email"
          name={DEPOSIT_FIELDS.email}
          required
          autoComplete="email"
          inputMode="email"
          aria-invalid={hasError}
          aria-describedby={hasError ? `${errorId} ${microId}` : microId}
          className="h-14 w-full rounded-none border-0 border-b border-ink/40 bg-transparent px-0 text-ink placeholder:text-stone focus:border-ink focus:outline-none"
        />
      </div>

      <fieldset>
        <legend className={`${MICRO_CLASS} mb-3 text-stone`}>{site.deposit.journeyLabel}</legend>
        <div className="flex flex-col border-t border-mist">
          {journeys.map((j, i) => (
            <label
              key={j.id}
              className="flex cursor-pointer items-center gap-4 border-b border-mist py-5"
            >
              <input
                type="radio"
                name={DEPOSIT_FIELDS.journey}
                value={j.id}
                required
                defaultChecked={i === 0}
                className="size-4 accent-ink"
              />
              <span>
                <span className={`${MICRO_CLASS} block text-ink`}>{j.label}</span>
                <span className="block text-[0.9375rem] leading-[1.6] text-stone">{j.window}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="group inline-flex h-14 w-full items-center justify-center gap-3 rounded-none bg-ember px-8 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-bone transition-colors hover:bg-ember-deep disabled:opacity-70 sm:w-auto"
        >
          {site.deposit.submit}
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </button>
        {hasError ? (
          <p id={errorId} role="alert" className="mt-3 text-[0.8125rem] leading-[1.5] text-ink">
            {state.message}
          </p>
        ) : null}
        <p id={microId} className="mt-3 text-[0.8125rem] leading-[1.5] text-stone">
          {site.deposit.microcopy}
        </p>
      </div>
    </form>
  )
}
