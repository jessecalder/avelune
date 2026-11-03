"use client"

import { useEffect, useId, useRef, useState } from "react"
import { MICRO_CLASS } from "@/components/maison/primitives"
import { BUTTON_CLASS, BUTTON_QUIET_CLASS } from "./kit"

type Target = HTMLInputElement | HTMLTextAreaElement

type Note = "idle" | "copied" | "selected" | "failed"

const NOTES: Record<Note, string> = {
  idle: "",
  copied: "Copied to the clipboard.",
  selected: "Selected. Press Ctrl+C or Command+C to copy it.",
  failed: "Couldn't copy. Select the text and copy it by hand.",
}

/**
 * Copies `text` to the clipboard and says "Copied" for two seconds. Where the clipboard is not
 * available (an insecure page, a refused permission) it selects the field `select` returns, so
 * the owner can copy it by hand.
 */
export function CopyButton({
  text,
  label = "Copy",
  select,
  quiet = true,
}: {
  text: string
  label?: string
  select?: () => Target | null | undefined
  quiet?: boolean
}) {
  const [note, setNote] = useState<Note>("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    let result: Note
    try {
      await navigator.clipboard.writeText(text)
      result = "copied"
    } catch {
      const field = select?.()
      if (field) {
        field.focus()
        field.select()
        result = "selected"
      } else {
        result = "failed"
      }
    }
    setNote(result)
    clearTimeout(timer.current)
    // The fallback messages stay longer: they ask the owner to do something.
    timer.current = setTimeout(() => setNote("idle"), result === "copied" ? 2000 : 8000)
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button type="button" onClick={copy} className={quiet ? BUTTON_QUIET_CLASS : BUTTON_CLASS}>
        {note === "copied" ? "Copied" : label}
      </button>
      <span
        role="status"
        aria-live="polite"
        className={note === "selected" || note === "failed" ? "text-[0.8125rem] text-stone" : "sr-only"}
      >
        {NOTES[note]}
      </span>
    </span>
  )
}

/** A read-only text box with a copy button beside it, for a value the owner has to paste somewhere. */
export function CopyField({ label, value, copyLabel = "Copy" }: { label: string; value: string; copyLabel?: string }) {
  const id = useId()
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div>
      <label htmlFor={id} className={`${MICRO_CLASS} block text-stone`}>
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <input
          id={id}
          ref={ref}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 basis-[18rem] border-0 border-b border-ink/40 bg-transparent px-0 py-2 text-[0.9375rem] text-ink focus:border-ink focus:outline-none"
        />
        <CopyButton text={value} label={copyLabel} select={() => ref.current} />
      </div>
    </div>
  )
}
