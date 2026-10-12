import type { Metadata } from "next"
import { site } from "@/content/site"
import { PageShell } from "@/components/PageShell"

export const metadata: Metadata = { title: site.privacy.title }

export default function PrivacyPage() {
  return (
    <PageShell title={site.privacy.title} eyebrow={`Updated ${site.privacy.updated}`}>
      {site.privacy.paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <p>
        Questions:{" "}
        <a href={`mailto:${site.contactEmail}`} className="underline underline-offset-4">
          {site.contactEmail}
        </a>
      </p>
    </PageShell>
  )
}
