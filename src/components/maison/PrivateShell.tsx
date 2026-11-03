import Link from "next/link"
import { connection } from "next/server"
import { Suspense, type ReactNode } from "react"
import { site } from "@/content/site"
import { stripeTestMode } from "@/lib/payments/config"
import { MICRO_CLASS, Wordmark } from "./primitives"

const LINK =
  "font-sans text-[0.6875rem] font-medium uppercase leading-[1.9] tracking-[0.28em] text-ink underline decoration-transparent decoration-1 underline-offset-[10px] transition-colors hover:decoration-ink"

/** A thin bar while Stripe is in test mode. Read per request: the key is not known at build time. */
async function TestModeBar() {
  await connection()
  if (!stripeTestMode()) return null
  return (
    <div className="bg-ink px-4 py-2 text-center">
      <p className={`${MICRO_CLASS} text-bone`}>{site.pay.testMode}</p>
    </div>
  )
}

/**
 * Minimal chrome for pages a family reaches from a private link: the wordmark and nothing to
 * browse, then a slim footer with how to reach us. No section nav, no early-access call to action.
 */
export function PrivateShell({ children }: { children: ReactNode }) {
  const privacy = site.footer.links.find((l) => l.href === "/privacy")
  return (
    <div className="flex min-h-svh flex-col bg-bone">
      <Suspense fallback={null}>
        <TestModeBar />
      </Suspense>
      <header className="border-b border-mist bg-bone">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-center px-4 sm:h-24 sm:px-6">
          <Link href="/" className="text-ink">
            <Wordmark />
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-mist bg-bone py-10 sm:py-12">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-center gap-x-12 gap-y-3 px-4 text-center sm:flex-row sm:px-6">
          <a href={`mailto:${site.contactEmail}`} className={LINK}>
            {site.contactEmail}
          </a>
          {privacy ? (
            <Link href={privacy.href} className={LINK}>
              {privacy.label}
            </Link>
          ) : null}
        </div>
        <p className="mt-6 px-4 text-center font-sans text-[0.8125rem] text-stone">{site.footer.legal}</p>
      </footer>
    </div>
  )
}
