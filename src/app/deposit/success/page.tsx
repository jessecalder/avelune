import type { Metadata } from "next"
import { Suspense } from "react"
import Link from "next/link"
import { Footer } from "@/components/Footer"
import { Wordmark } from "@/components/Wordmark"
import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { depositsEnabled } from "@/lib/deposits/config"
import { getStripe } from "@/lib/stripe"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export const metadata: Metadata = {
  title: site.deposit.success.title,
  robots: { index: false, follow: false },
}

async function isPaid(sessionId: string | undefined): Promise<boolean> {
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId) || !depositsEnabled()) return false
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId)
    return session.payment_status === "paid"
  } catch (err) {
    console.error("[deposits] could not retrieve checkout session:", err)
    return false
  }
}

// The query string only names a session; Stripe decides whether it was paid.
async function Outcome({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).session_id
  const paid = await isPaid(typeof raw === "string" ? raw : undefined)
  const copy = paid ? site.deposit.success : site.deposit.cancelled
  return (
    <>
      <h1 className="display text-[clamp(2.5rem,5vw,4.5rem)] font-semibold text-ink">{copy.title}</h1>
      <p className="measure mt-10 text-[1.0625rem] leading-[1.55] text-ink">{copy.body}</p>
    </>
  )
}

export default function DepositSuccessPage(props: { searchParams: SearchParams }) {
  // PageShell fixes its h1 at render time; the title here depends on Stripe's answer,
  // so the same chrome is assembled directly around the dynamic part.
  return (
    <>
      <header className="bg-bone">
        <Container className="flex h-20 items-center">
          <Link href="/" aria-label="Avelune home" className="text-ink">
            <Wordmark size={28} />
          </Link>
        </Container>
      </header>
      <main id="main" className="bg-bone py-16 lg:py-24">
        <Container>
          <Suspense fallback={null}>
            <Outcome searchParams={props.searchParams} />
          </Suspense>
        </Container>
      </main>
      <Footer />
    </>
  )
}
