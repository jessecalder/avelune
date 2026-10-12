import type { Metadata } from "next"
import { PageShell } from "@/components/PageShell"
import { site } from "@/content/site"

export const metadata: Metadata = {
  title: site.deposit.cancelled.title,
  robots: { index: false, follow: false },
}

export default function DepositCancelledPage() {
  return (
    <PageShell title={site.deposit.cancelled.title}>
      <p>{site.deposit.cancelled.body}</p>
    </PageShell>
  )
}
