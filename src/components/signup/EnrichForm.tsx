"use client"

import { useActionState, useId, useState } from "react"
import { enrichSignup } from "@/app/actions/early-access"
import { site } from "@/content/site"
import { DESTINATION_OPTIONS, ENRICH_FIELDS, ENRICH_INITIAL } from "@/lib/signups/types"

type Props = { token: string; variant: "dark" | "light" }

export function EnrichForm({ token, variant }: Props) {
  const [state, formAction, pending] = useActionState(enrichSignup, ENRICH_INITIAL)
  const [dismissed, setDismissed] = useState(false)
  const uid = useId()
  const nameId = `${uid}-name`
  const notesId = `${uid}-notes`
  const dark = variant === "dark"
  const copy = site.signup.enrich

  if (dismissed) return null

  if (state.status === "saved") {
    return (
      <div className="mt-6 animate-fade" role="status">
        <p
          className={`font-display font-semibold text-[1.5rem] lg:text-[1.75rem] leading-[1.1] [font-variation-settings:'opsz'_48,'SOFT'_0,'WONK'_0] ${dark ? "text-bone" : "text-ink"}`}
        >
          {copy.saved.headline}
        </p>
        <p className={`mt-2 text-[1.0625rem] leading-[1.55] ${dark ? "text-bone/70" : "text-stone"}`}>{copy.saved.body}</p>
      </div>
    )
  }

  const labelCls = `eyebrow mb-2 block ${dark ? "text-bone/70" : "text-stone"}`
  const inputCls = dark
    ? "w-full border border-moon/60 bg-transparent px-4 text-bone placeholder:text-bone/50 focus:border-moon focus:outline-none"
    : "w-full border border-ink/25 bg-transparent px-4 text-ink placeholder:text-stone focus:border-ink focus:outline-none"
  const chipCls = dark
    ? "cursor-pointer border border-moon/60 px-3 py-1.5 text-sm text-bone transition-colors has-[:checked]:bg-moon has-[:checked]:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-moon"
    : "cursor-pointer border border-ink/30 px-3 py-1.5 text-sm text-ink transition-colors has-[:checked]:bg-ink has-[:checked]:text-bone has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ember"
  const rise = (i: number) => ({ animationDelay: `${i * 80}ms` })

  return (
    <form action={formAction} className="mt-5 space-y-6">
      <input type="hidden" name={ENRICH_FIELDS.token} value={token} />

      <div className="animate-rise" style={rise(0)}>
        <label htmlFor={nameId} className={labelCls}>
          {copy.nameLabel}
        </label>
        <input
          id={nameId}
          type="text"
          name={ENRICH_FIELDS.name}
          autoComplete="given-name"
          maxLength={80}
          className={`h-14 ${inputCls} sm:max-w-sm`}
        />
      </div>

      <fieldset className="animate-rise" style={rise(1)}>
        <legend className={labelCls}>{copy.agesLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {copy.ages.map((item) => (
            <label key={item.value} className={chipCls}>
              <input type="checkbox" className="sr-only" name={ENRICH_FIELDS.childrenAges} value={item.value} />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="animate-rise" style={rise(2)}>
        <legend className={labelCls}>{copy.journeyLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {DESTINATION_OPTIONS.map((item) => (
            <label key={item.value} className={chipCls}>
              <input type="checkbox" className="sr-only" name={ENRICH_FIELDS.destinations} value={item.value} />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="animate-rise" style={rise(3)}>
        <label htmlFor={notesId} className={labelCls}>
          {copy.notesLabel}
        </label>
        <textarea
          id={notesId}
          name={ENRICH_FIELDS.notes}
          rows={3}
          maxLength={500}
          placeholder={copy.notesPlaceholder}
          className={`${inputCls} py-3 leading-[1.5]`}
        />
        <p className={`mt-2 text-[0.8125rem] leading-[1.5] ${dark ? "text-bone/70" : "text-stone"}`}>{copy.privacyNote}</p>
      </div>

      {state.status === "error" ? (
        <p role="alert" className={`text-[0.8125rem] leading-[1.5] ${dark ? "text-moon" : "text-ember"}`}>
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 animate-rise" style={rise(4)}>
        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="group inline-flex h-14 items-center justify-center gap-3 bg-ember px-6 font-medium text-bone transition-colors hover:bg-ember-deep disabled:opacity-70"
        >
          {pending ? site.signup.submitting : copy.submit}
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className={`text-[0.9375rem] underline underline-offset-4 ${dark ? "text-bone/70 hover:text-bone" : "text-stone hover:text-ink"}`}
        >
          {copy.skip}
        </button>
      </div>
    </form>
  )
}
