"use client"

import { useEffect } from "react"
import { MICRO_CLASS, Wordmark } from "@/components/maison/primitives"
import { site } from "@/content/site"

/** The page could not be built (usually a database or Stripe hiccup). Calm, with a way forward. */
export default function PayError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error("[payments] /pay failed to render:", error)
  }, [error])

  return (
    <div className="flex min-h-svh flex-col bg-bone">
      <header className="border-b border-mist">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-center px-4 sm:h-24 sm:px-6">
          <p className="text-ink">
            <Wordmark />
          </p>
        </div>
      </header>
      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-[34rem] px-4 py-20 text-center sm:px-6 sm:py-32">
          <p className={`${MICRO_CLASS} pl-[0.28em] text-stone`}>{site.pay.eyebrow}</p>
          <h1 className="mx-auto mt-6 max-w-[16ch] font-display text-[clamp(2.25rem,5vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.01em] text-balance text-ink">
            {site.pay.error.title}
          </h1>
          <p className="mx-auto mt-8 max-w-[40ch] font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">{site.pay.error.body}</p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-10 inline-flex h-14 w-full items-center justify-center rounded-none bg-ember px-6 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-bone transition-colors hover:bg-ember-deep"
          >
            {site.pay.error.retry}
          </button>
          <p className="mt-6 font-sans text-[0.8125rem] leading-[1.6] text-stone">
            <a href={`mailto:${site.contactEmail}`} className="text-ink underline underline-offset-4">
              {site.contactEmail}
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
