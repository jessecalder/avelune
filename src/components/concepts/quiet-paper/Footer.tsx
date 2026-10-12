import Link from "next/link"
import { Container } from "@/components/ui"
import { site } from "@/content/site"

export function Footer() {
  const { footer } = site
  return (
    <footer className="border-t border-mist py-16 lg:py-20">
      <Container>
        <div className="mx-auto grid max-w-[72rem] gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-[1.375rem] font-normal tracking-[0.04em] text-ink">{site.name}</p>
            <p className="mt-3 max-w-[32ch] text-[0.9375rem] leading-[1.6] text-ink-soft">{footer.line}</p>
          </div>
          <div>
            <a
              href={`mailto:${site.contactEmail}`}
              className="text-[0.9375rem] text-ink-soft underline decoration-mist underline-offset-4 transition-colors hover:text-ember hover:decoration-ember"
            >
              {site.contactEmail}
            </a>
          </div>
          <ul className="flex flex-col gap-3 md:items-end">
            {footer.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-[0.9375rem] text-ink-soft underline decoration-mist underline-offset-4 transition-colors hover:text-ember hover:decoration-ember">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mx-auto mt-14 max-w-[72rem] text-[0.8125rem] text-stone">{footer.legal}</p>
      </Container>
    </footer>
  )
}
