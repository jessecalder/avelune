import { site } from "@/content/site"
import { Body, Column, H2, Kicker, ROMAN, Words } from "./primitives"

export function HowItWorks() {
  const { howItWorks: h } = site
  return (
    <section aria-labelledby="qp-how-title" className="py-28 lg:py-40">
      <Column>
        <div className="text-center">
          <Kicker>{h.eyebrow}</Kicker>
          <H2 id="qp-how-title" className="mx-auto mt-6 max-w-[22ch]">
            <Words text={h.headline} />
          </H2>
          <Body className="mx-auto mt-8">{h.body}</Body>
        </div>
        <ol className="mt-20 grid gap-x-20 gap-y-14 sm:grid-cols-2 lg:mt-28">
          {h.pillars.map((p, i) => (
            <li key={p.title} className="border-t border-mist pt-8">
              <span aria-hidden="true" className="block font-display text-[2rem] font-light leading-none text-ember">
                {ROMAN[i]}
              </span>
              <h3 className="mt-6 font-display text-[1.5rem] font-medium leading-[1.2] text-ink">{p.title}</h3>
              <p className="mt-3 max-w-[48ch] text-[1rem] leading-[1.7] text-ink-soft">{p.body}</p>
            </li>
          ))}
        </ol>
      </Column>
    </section>
  )
}
