"use client"

import { useEffect, useRef } from "react"
import { site } from "@/content/site"
import { EnrichForm } from "./EnrichForm"

type Props = { token: string; variant: "dark" | "light" }

export function SignupSuccess({ token, variant }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const dark = variant === "dark"

  // Moving focus announces the state change to screen readers.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="animate-fade">
      <h2
        ref={headingRef}
        tabIndex={-1}
        className={`display text-[2rem] lg:text-[2.5rem] outline-none ${dark ? "text-bone" : "text-ink"}`}
      >
        {site.signup.success.headline}
      </h2>
      <p className={`mt-4 text-lg lg:text-xl leading-[1.5] ${dark ? "text-bone/90" : "text-ink"}`}>
        {site.signup.success.body}
      </p>
      <p className={`eyebrow mt-8 ${dark ? "text-moon" : "text-ember"}`}>{site.signup.success.enrichPrompt}</p>
      <EnrichForm token={token} variant={variant} />
    </div>
  )
}
