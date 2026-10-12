import Link from "next/link"
import { Container } from "@/components/ui"
import { site } from "@/content/site"
import { Micro, Wordmark } from "./primitives"

const LINK =
  "font-sans text-[0.6875rem] font-medium uppercase leading-[1.9] tracking-[0.28em] text-ink underline decoration-transparent decoration-1 underline-offset-[10px] transition-colors hover:decoration-ink"

export function Footer() {
  const { footer } = site
  return (
    <footer className="border-t border-mist bg-bone py-16">
      <Container>
        <div className="text-center">
          <p className="text-ink">
            <Wordmark />
          </p>
          <Micro className="mt-6">{footer.line}</Micro>
          <div className="mt-10 flex flex-col items-center justify-center gap-x-12 gap-y-3 sm:flex-row">
            <a href={`mailto:${site.contactEmail}`} className={LINK}>
              {site.contactEmail}
            </a>
            {footer.links.map((l) => (
              <Link key={l.href} href={l.href} className={LINK}>
                {l.label}
              </Link>
            ))}
          </div>
          <p className="mt-10 font-sans text-[0.8125rem] text-stone">{footer.legal}</p>
        </div>
      </Container>
    </footer>
  )
}
