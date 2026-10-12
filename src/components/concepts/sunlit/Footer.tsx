import Link from "next/link"
import { site } from "@/content/site"
import { Container } from "@/components/ui"

export function Footer() {
  return (
    <footer className="border-t border-mist bg-bone py-12 lg:py-16">
      <Container className="grid gap-8 lg:grid-cols-12 lg:gap-6">
        <div className="lg:col-span-5">
          <p className="font-display text-[2.5rem] font-extrabold leading-none tracking-[-0.03em] text-ink [font-variation-settings:'opsz'_72,'wdth'_100]">
            {site.name.toLowerCase()}
          </p>
          <p className="mt-4 text-ink-soft">{site.footer.line}</p>
        </div>
        <div className="lg:col-span-4">
          <a href={`mailto:${site.contactEmail}`} className="font-semibold text-ink underline underline-offset-4 decoration-ember hover:decoration-2">
            {site.contactEmail}
          </a>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 lg:col-span-3">
          {site.footer.links.map((link) => (
            <Link key={link.href} href={link.href} className="font-semibold text-ink underline-offset-4 hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-[0.875rem] text-stone lg:col-span-12">{site.footer.legal}</p>
      </Container>
    </footer>
  )
}
