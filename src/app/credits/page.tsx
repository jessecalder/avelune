import type { Metadata } from "next"
import { site } from "@/content/site"
import { photoCredits } from "@/content/photos"
import { PageShell } from "@/components/PageShell"

export const metadata: Metadata = { title: site.credits.title }

export default function CreditsPage() {
  return (
    <PageShell title={site.credits.title}>
      <p>{site.credits.intro}</p>
      <ul className="space-y-2">
        {photoCredits().map((c) => (
          <li key={c.name}>
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              {c.name}
            </a>
          </li>
        ))}
      </ul>
      <p>
        {site.credits.license.before}{" "}
        <a href={site.credits.license.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          {site.credits.license.linkLabel}
        </a>
        .
      </p>
    </PageShell>
  )
}
