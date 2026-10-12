import { site } from "@/content/site"
import { Column, H3_SIZE, Label, ROMAN, SectionHead } from "./primitives"

export function HowItWorks() {
  const { howItWorks: h } = site
  return (
    <section aria-labelledby="nocturne-how-title" className="bg-ink pb-28 lg:pb-44">
      <Column>
        <div className="border-t border-mist pt-28 lg:pt-44">
          <SectionHead id="nocturne-how-title" eyebrow={h.eyebrow} headline={h.headline} h2Class="max-w-[18ch]" />
        </div>
        <ol className="mx-auto mt-20 grid max-w-[60rem] border-b border-mist md:grid-cols-2 lg:mt-28">
          {h.pillars.map((p, i) => (
            <li
              key={p.title}
              className={`reveal border-t border-mist px-0 py-12 text-center md:px-10 lg:py-16 ${i % 2 === 0 ? "md:border-r" : ""}`}
            >
              <Label aria-hidden="true" as="span">
                {ROMAN[i]}
              </Label>
              <h3 className={`${H3_SIZE} mt-6 text-bone`}>{p.title}</h3>
              <p className="mx-auto mt-5 max-w-[36ch] font-sans text-[1.0625rem] leading-[1.75] text-bone/85">{p.body}</p>
            </li>
          ))}
        </ol>
      </Column>
    </section>
  )
}
