import Link from "next/link"
import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { Label, labelLink } from "./primitives"

export function Footer() {
  const { footer } = site
  return (
    <footer className="border-t border-mist bg-ink py-16 text-center">
      <Container>
        <p className="font-display text-[1.125rem] uppercase tracking-[0.36em] text-bone">{site.name}</p>
        <Label tone="stone" className="mt-6">
          {footer.line}
        </Label>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          <a href={`mailto:${site.contactEmail}`} className={labelLink}>
            {site.contactEmail}
          </a>
          {footer.links.map((l) => (
            <Link key={l.href} href={l.href} className={labelLink}>
              {l.label}
            </Link>
          ))}
        </div>
        <Label tone="stone" className="mt-10">
          {footer.legal}
        </Label>
      </Container>
    </footer>
  )
}
