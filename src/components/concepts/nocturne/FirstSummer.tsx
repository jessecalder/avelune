import { Fragment } from "react"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Container } from "@/components/ui"
import { Column, Frame, H3_SIZE, Label, NUMERAL, ROMAN, SectionHead, VRule } from "./primitives"

export function FirstSummer() {
  const { firstSummer: f } = site
  return (
    <section aria-labelledby="nocturne-summer-title" className="bg-ink py-28 lg:py-44">
      <Column>
        <SectionHead id="nocturne-summer-title" eyebrow={f.eyebrow} headline={f.headline} body={f.body} h2Class="max-w-[20ch]" />

        <div className="mt-20 flex items-center justify-center gap-5 sm:gap-14 lg:mt-28">
          {f.stats.map((s, i) => (
            <Fragment key={s.label}>
              {i > 0 ? <VRule tone="mist" /> : null}
              <div className="reveal text-center">
                <p className={NUMERAL}>{s.value}</p>
                <Label tone="bone-soft" className="mt-4">
                  {s.label}
                </Label>
              </div>
            </Fragment>
          ))}
        </div>

        <ol className="mt-24 grid gap-x-12 gap-y-16 lg:mt-36 lg:grid-cols-3">
          {f.rhythm.map((r, i) => (
            <li key={r.title} className="reveal border-t border-mist pt-10 text-center">
              <Label aria-hidden="true" as="span">
                {ROMAN[i]}
              </Label>
              <h3 className={`${H3_SIZE} mt-6 text-bone`}>{r.title}</h3>
              <p className="mx-auto mt-5 max-w-[40ch] font-sans text-[1.0625rem] leading-[1.75] text-bone/85">{r.body}</p>
            </li>
          ))}
        </ol>
      </Column>
      <Container>
        <div className="reveal mx-auto mt-28 max-w-[64rem] lg:mt-44">
          <Frame photo={photos.longTableOcean} aspect="aspect-[3/2]" sizes="(min-width: 1024px) 64rem, 100vw" />
        </div>
      </Container>
    </section>
  )
}
