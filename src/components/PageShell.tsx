import type { ReactNode } from "react"
import { Footer } from "@/components/maison/Footer"
import { Nav } from "@/components/maison/Nav"
import { Micro } from "@/components/maison/primitives"

/** Shared by PageShell and pages that assemble their own chrome around dynamic content. */
export const PAGE_MAIN_CLASS = "bg-bone py-20 lg:py-32"
export const PAGE_COLUMN_CLASS = "mx-auto w-full max-w-[44rem] px-4 sm:px-6"
export const PAGE_H1_CLASS = "display text-[clamp(2.25rem,4.5vw,4rem)] text-ink"
export const PAGE_BODY_CLASS = "font-sans text-[1.0625rem] leading-[1.75] text-ink-soft"

export function PageShell({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <>
      <Nav />
      <main id="main" className={PAGE_MAIN_CLASS}>
        <div className={PAGE_COLUMN_CLASS}>
          {eyebrow ? <Micro className="mb-6">{eyebrow}</Micro> : null}
          <h1 className={PAGE_H1_CLASS}>{title}</h1>
          <div className={`${PAGE_BODY_CLASS} mt-10 space-y-6`}>{children}</div>
        </div>
      </main>
      <Footer />
    </>
  )
}
