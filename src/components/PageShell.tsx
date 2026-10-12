import Link from "next/link"
import type { ReactNode } from "react"
import { Container, Eyebrow } from "@/components/ui"
import { Footer } from "@/components/Footer"
import { Wordmark } from "@/components/Wordmark"

export function PageShell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <>
      <header className="bg-bone">
        <Container className="flex h-20 items-center">
          <Link href="/" aria-label="Avelune home" className="text-ink">
            <Wordmark size={28} />
          </Link>
        </Container>
      </header>
      <main id="main" className="bg-bone py-16 lg:py-24">
        <Container>
          {eyebrow ? <Eyebrow className="mb-6">{eyebrow}</Eyebrow> : null}
          <h1 className="display text-[clamp(2.5rem,5vw,4.5rem)] font-semibold text-ink">{title}</h1>
          <div className="measure mt-10 space-y-6 text-[1.0625rem] leading-[1.55] text-ink">{children}</div>
        </Container>
      </main>
      <Footer />
    </>
  )
}
