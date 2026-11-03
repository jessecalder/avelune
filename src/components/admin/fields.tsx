"use client"

/**
 * Client form pieces for admin pages. Every form posts to a server action shaped
 * (prev: FormState, formData) => Promise<FormState>. The admin needs JavaScript: its pages
 * stream in behind Suspense, which stays hidden without it.
 */
import { startTransition, useActionState, useEffect, useId, useRef, type FormEvent, type ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { MICRO_CLASS } from "@/components/maison/primitives"
import { FORM_IDLE, type FormState } from "@/lib/admin/forms"
import { BUTTON_CLASS, BUTTON_QUIET_CLASS } from "./kit"

type Action = (prev: FormState, formData: FormData) => Promise<FormState>

const INPUT_CLASS =
  "w-full border-0 border-b border-ink/40 bg-transparent px-0 py-2 text-[0.9375rem] text-ink placeholder:text-stone focus:border-ink focus:outline-none disabled:text-stone"

/**
 * Wraps a server action with pending state and a status line. `resetOnSave` clears the form
 * after a successful save (for "add" forms); edit forms keep their values.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  resetOnSave = false,
  className = "",
  hidden,
}: {
  action: Action
  children: ReactNode
  submitLabel?: string
  resetOnSave?: boolean
  className?: string
  /** Hidden inputs, e.g. { id: row.id }. */
  hidden?: Record<string, string>
}) {
  const [state, formAction, pending] = useActionState(action, FORM_IDLE)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (resetOnSave && state.status === "saved") ref.current?.reset()
  }, [state, resetOnSave])
  // React resets an uncontrolled <form action> after every submit, which would wipe the owner's
  // typing when a save fails. Submit by hand so only resetOnSave clears the form.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const submitter = (e.nativeEvent as SubmitEvent).submitter
    const data = new FormData(e.currentTarget, submitter instanceof HTMLElement ? submitter : null)
    startTransition(() => formAction(data))
  }
  return (
    <form ref={ref} action={formAction} onSubmit={onSubmit} className={className}>
      {hidden ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">{children}</div>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
        <StatusLine state={state} />
      </div>
    </form>
  )
}

/** `pending` overrides the form status, for forms submitted by hand (see ActionForm). */
export function SubmitButton({ children, quiet = false, pending: pendingProp }: { children: ReactNode; quiet?: boolean; pending?: boolean }) {
  const { pending: formPending } = useFormStatus()
  const pending = pendingProp ?? formPending
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={quiet ? BUTTON_QUIET_CLASS : BUTTON_CLASS}>
      {pending ? "Saving" : children}
    </button>
  )
}

export function StatusLine({ state }: { state: FormState }) {
  if (state.status === "error") {
    return (
      <p role="alert" className="text-[0.875rem] text-ink">
        <span className="font-medium">Not saved.</span> {state.message}
      </p>
    )
  }
  if (state.status === "saved") {
    return (
      <p role="status" className="text-[0.875rem] text-stone">
        {state.message ?? "Saved."}
      </p>
    )
  }
  return null
}

/**
 * A one-button form for destructive or state-changing actions (delete, mark done). Asks for
 * confirmation in the browser when `confirm` is set.
 */
export function ActionButton({
  action,
  hidden,
  children,
  confirm,
  quiet = true,
}: {
  action: Action
  hidden: Record<string, string>
  children: ReactNode
  confirm?: string
  quiet?: boolean
}) {
  const [state, formAction] = useActionState(action, FORM_IDLE)
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault()
      }}
      className="inline-flex flex-wrap items-center gap-3"
    >
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton quiet={quiet}>{children}</SubmitButton>
      {state.status === "error" ? (
        <span role="alert" className="text-[0.8125rem] text-ink">
          {state.message}
        </span>
      ) : null}
    </form>
  )
}

function FieldShell({ id, label, hint, wide, children }: { id: string; label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className={`${MICRO_CLASS} block text-stone`}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-[0.8125rem] text-stone">{hint}</p> : null}
    </div>
  )
}

type Common = { name: string; label: string; hint?: string; required?: boolean; wide?: boolean; disabled?: boolean }

export function TextField({
  defaultValue,
  type = "text",
  placeholder,
  maxLength,
  ...p
}: Common & { defaultValue?: string | null; type?: "text" | "email" | "tel" | "url"; placeholder?: string; maxLength?: number }) {
  const id = useId()
  return (
    <FieldShell id={id} label={p.label} hint={p.hint} wide={p.wide}>
      <input
        id={id}
        name={p.name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={p.required}
        disabled={p.disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        className={INPUT_CLASS}
      />
    </FieldShell>
  )
}

export function TextArea({ defaultValue, rows = 3, maxLength, ...p }: Common & { defaultValue?: string | null; rows?: number; maxLength?: number }) {
  const id = useId()
  return (
    <FieldShell id={id} label={p.label} hint={p.hint} wide={p.wide ?? true}>
      <textarea
        id={id}
        name={p.name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        required={p.required}
        disabled={p.disabled}
        maxLength={maxLength}
        className={`${INPUT_CLASS} resize-y leading-[1.6]`}
      />
    </FieldShell>
  )
}

export function SelectField({
  options,
  defaultValue,
  blank,
  ...p
}: Common & { options: readonly { value: string; label: string }[]; defaultValue?: string | null; blank?: string }) {
  const id = useId()
  return (
    <FieldShell id={id} label={p.label} hint={p.hint} wide={p.wide}>
      <select id={id} name={p.name} defaultValue={defaultValue ?? ""} required={p.required} disabled={p.disabled} className={`${INPUT_CLASS} cursor-pointer`}>
        {blank !== undefined ? <option value="">{blank}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

export function DateField({ defaultValue, ...p }: Common & { defaultValue?: string | null }) {
  const id = useId()
  return (
    <FieldShell id={id} label={p.label} hint={p.hint} wide={p.wide}>
      <input id={id} name={p.name} type="date" defaultValue={defaultValue ?? ""} required={p.required} disabled={p.disabled} className={INPUT_CLASS} />
    </FieldShell>
  )
}

/** Value is Pacific wall-clock time; read it with pacificDateTime() and prefill with toPacificInput(). */
export function DateTimeField({ defaultValue, ...p }: Common & { defaultValue?: string | null }) {
  const id = useId()
  return (
    <FieldShell id={id} label={`${p.label} (PT)`} hint={p.hint} wide={p.wide}>
      <input id={id} name={p.name} type="datetime-local" defaultValue={defaultValue ?? ""} required={p.required} disabled={p.disabled} className={INPUT_CLASS} />
    </FieldShell>
  )
}

/** Dollars (or other major units) typed by hand; read it with cents(). Prefill with centsToInput(). */
export function MoneyField({ defaultValue, ...p }: Common & { defaultValue?: string | null }) {
  const id = useId()
  return (
    <FieldShell id={id} label={p.label} hint={p.hint} wide={p.wide}>
      <input
        id={id}
        name={p.name}
        type="text"
        inputMode="decimal"
        defaultValue={defaultValue ?? ""}
        required={p.required}
        disabled={p.disabled}
        placeholder="0.00"
        className={`${INPUT_CLASS} tabular-nums`}
      />
    </FieldShell>
  )
}

export function NumberField({ defaultValue, min, max, step, ...p }: Common & { defaultValue?: number | string | null; min?: number; max?: number; step?: number | "any" }) {
  const id = useId()
  return (
    <FieldShell id={id} label={p.label} hint={p.hint} wide={p.wide}>
      <input
        id={id}
        name={p.name}
        type="number"
        defaultValue={defaultValue ?? ""}
        min={min}
        max={max}
        step={step}
        required={p.required}
        disabled={p.disabled}
        className={`${INPUT_CLASS} tabular-nums`}
      />
    </FieldShell>
  )
}

export function CheckboxField({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  const id = useId()
  return (
    <div className="flex items-start gap-3 self-end">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="mt-1 size-4 accent-ink" />
      <div>
        <label htmlFor={id} className="text-[0.9375rem] text-ink">
          {label}
        </label>
        {hint ? <p className="text-[0.8125rem] text-stone">{hint}</p> : null}
      </div>
    </div>
  )
}

/** Disclosure for "Add …" and "Edit" forms so long pages stay scannable. Native <details>. */
export function Disclosure({ summary, children, open = false }: { summary: string; children: ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-t border-mist py-4">
      <summary className={`${MICRO_CLASS} cursor-pointer list-none text-ink [&::-webkit-details-marker]:hidden`}>
        <span aria-hidden="true" className="mr-2 inline-block transition-transform group-open:rotate-45">
          +
        </span>
        {summary}
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  )
}
