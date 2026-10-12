import type { ReactNode } from "react"
import type { Headline as HeadlineData } from "@/content/site"
import { SignupForm, type SignupFormProps } from "@/components/signup/SignupForm"

/** Type scale shared by every section. */
export const H1 =
  "font-display font-extrabold text-balance leading-[0.9] tracking-[-0.03em] [font-variation-settings:'opsz'_96,'wdth'_100]"
export const H2 =
  "font-display font-bold text-balance text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.95] tracking-[-0.02em] [font-variation-settings:'opsz'_72,'wdth'_100]"
export const H3 = "font-display font-semibold text-[1.5rem] leading-[1.1] lg:text-[1.875rem] [font-variation-settings:'opsz'_36,'wdth'_100]"
export const BIG_NUM =
  "font-display font-extrabold lining-nums tabular-nums text-[4rem] leading-none lg:text-[5.5rem] [font-variation-settings:'opsz'_96,'wdth'_100]"
export const BODY = "text-[1.0625rem] leading-[1.6]"
export const SOFT_SHADOW = "shadow-[0_20px_60px_-20px_rgba(30,27,24,.25)]"

/** Eyebrow with a round bullet; colour comes from `className` (text-*). */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`inline-flex items-center gap-2 font-sans text-[0.75rem] font-semibold uppercase tracking-[0.16em] ${className}`}>
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
      {children}
    </p>
  )
}

/** Headline copy with its accent word in a colour (same font, not italic). */
export function Headline({ text, accentClass = "text-ember" }: { text: HeadlineData; accentClass?: string }) {
  if (!text.accent) return <>{text.before}</>
  return (
    <>
      {text.before} <span className={accentClass}>{text.accent}</span>
      {text.after ? ` ${text.after}` : null}
    </>
  )
}

/**
 * SignupForm has square fields; the wrapper rounds them and sets the button
 * label to ink, because bone on terracotta is only 3.4:1 and ink is 4.7:1.
 */
export function RoundForm(props: SignupFormProps) {
  return (
    <div className="[&_button:hover]:bg-cacao [&_button]:rounded-full [&_button]:font-semibold [&_button]:text-ink [&_input]:rounded-full [&_input]:px-6">
      <SignupForm {...props} />
    </div>
  )
}
