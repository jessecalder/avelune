import type { Metadata } from "next"
import { connection } from "next/server"
import { Suspense } from "react"
import { PageShell } from "@/components/PageShell"
import { site } from "@/content/site"
import { depositsEnabled, JOURNEYS } from "@/lib/deposits/config"
import type { JourneyId } from "@/lib/deposits/types"
import { DepositForm } from "./DepositForm"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export const metadata: Metadata = {
  title: site.deposit.title,
  robots: { index: false, follow: false },
}

async function DepositBody({ searchParams }: { searchParams: SearchParams }) {
  // Env is read per request; without a request-time API the gate would be frozen at build time.
  await connection()
  if (!depositsEnabled()) return <p>{site.deposit.closed}</p>
  const params = await searchParams
  const raw = params.token
  const token = typeof raw === "string" && /^[a-f0-9]{48}$/.test(raw) ? raw : undefined
  const journeys = (Object.keys(JOURNEYS) as JourneyId[]).map((id) => ({ id, ...JOURNEYS[id] }))
  return <DepositForm journeys={journeys} token={token} />
}

export default function DepositPage(props: { searchParams: SearchParams }) {
  return (
    <PageShell title={site.deposit.title} eyebrow={site.deposit.eyebrow}>
      <p>{site.deposit.intro}</p>
      <Suspense fallback={null}>
        <DepositBody searchParams={props.searchParams} />
      </Suspense>
    </PageShell>
  )
}
