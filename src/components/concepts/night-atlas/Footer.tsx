import Link from "next/link"
import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { GRID, MONO } from "./parts"

export function NightFooter() {
  return (
    <footer className={`border-t border-moon/40 bg-ink py-16 ${GRID}`}>
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-5">
          <Link
            href="/concepts/night-atlas"
            aria-label={`${site.name} home`}
            className="font-display text-[1.75rem] font-bold uppercase tracking-[0.18em] text-bone [font-variation-settings:'wdth'_70]"
          >
            {site.name}
          </Link>
          <p className={`${MONO} mt-4 text-[0.75rem] uppercase leading-[1.6] tracking-[0.12em] text-moon`}>{site.footer.line}</p>
        </div>
        <div className="lg:col-span-4">
          <a href={`mailto:${site.contactEmail}`} className={`${MONO} text-[0.875rem] tracking-[0.04em] text-bone underline-offset-4 hover:text-moon hover:underline`}>
            {site.contactEmail}
          </a>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 lg:col-span-3">
          {site.footer.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${MONO} text-[0.75rem] uppercase tracking-[0.12em] text-bone/80 hover:text-moon`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className={`${MONO} text-[0.75rem] uppercase tracking-[0.12em] text-bone/60 lg:col-span-12`}>{site.footer.legal}</p>
      </Container>
    </footer>
  )
}
