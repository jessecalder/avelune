import Link from "next/link"
import { site } from "@/content/site"
import { Container } from "@/components/ui"
import { Wordmark } from "@/components/Wordmark"

export function Footer() {
  return (
    <footer className="bg-ink py-16 text-bone">
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-x-6">
        <div className="lg:col-span-5">
          <Link href="/" aria-label="Avelune home" className="text-moon">
            <Wordmark size={28} />
          </Link>
          <p className="mt-4 text-bone/70">{site.footer.line}</p>
        </div>
        <div className="lg:col-span-4">
          <a href={`mailto:${site.contactEmail}`} className="text-bone underline-offset-4 hover:underline">
            {site.contactEmail}
          </a>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 lg:col-span-3">
          {site.footer.links.map((link) => (
            <Link key={link.href} href={link.href} className="text-bone/70 hover:text-moon">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-bone/50 lg:col-span-12">{site.footer.legal}</p>
      </Container>
    </footer>
  )
}
