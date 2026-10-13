import type { Metadata } from "next"
import { Suspense } from "react"
import { Footer } from "@/components/maison/Footer"
import { Nav } from "@/components/maison/Nav"
import { PAGE_BODY_CLASS, PAGE_COLUMN_CLASS, PAGE_H1_CLASS, PAGE_MAIN_CLASS } from "@/components/PageShell"
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
      <h1 className={PAGE_H1_CLASS}>{copy.title}</h1>
      <p className={`${PAGE_BODY_CLASS} mt-10`}>{copy.body}</p>
    </>
  )
}

export default function DepositSuccessPage(props: { searchParams: SearchParams }) {
  // PageShell fixes its h1 at render time; the title here depends on Stripe's answer,
  // so the same chrome is assembled directly around the dynamic part.
  return (
    <>
      <Nav />
      <main id="main" className={PAGE_MAIN_CLASS}>
        <div className={PAGE_COLUMN_CLASS}>
          <Suspense fallback={null}>
            <Outcome searchParams={props.searchParams} />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  )
}
