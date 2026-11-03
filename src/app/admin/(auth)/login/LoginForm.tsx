"use client"

import { useActionState, useId } from "react"
import { MICRO_CLASS } from "@/components/maison/primitives"
import { login } from "./actions"
import { LOGIN_FIELDS, LOGIN_INITIAL } from "./state"

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, LOGIN_INITIAL)
  const uid = useId()
  const fieldId = `${uid}-password`
  const errorId = `${uid}-error`

  return (
    <form action={formAction} className="mt-12 w-full max-w-sm">
      <input type="hidden" name={LOGIN_FIELDS.next} value={next} />
      <label htmlFor={fieldId} className={`${MICRO_CLASS} block text-stone`}>
        Password
      </label>
      <input
        id={fieldId}
        type="password"
        name={LOGIN_FIELDS.password}
        autoComplete="current-password"
        required
        maxLength={1024}
        aria-invalid={state.status === "error"}
        aria-describedby={state.status === "error" ? errorId : undefined}
        className="mt-2 h-14 w-full rounded-none border-x-0 border-t-0 border-b border-ink/40 bg-transparent px-0 text-ink focus:border-ink focus:outline-none"
      />
      {state.status === "error" ? (
        <p id={errorId} role="alert" className="mt-3 font-sans text-[0.8125rem] leading-[1.5] text-ink">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="mt-10 inline-flex h-14 w-full items-center justify-center rounded-none bg-ember px-8 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-bone transition-colors hover:bg-ember-deep disabled:opacity-70"
      >
        {pending ? "Signing in" : "Sign in"}
      </button>
    </form>
  )
}
