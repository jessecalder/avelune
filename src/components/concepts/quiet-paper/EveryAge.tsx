import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Body, Column, Framed, H2, Kicker, Words } from "./primitives"

export function EveryAge() {
  const { everyAge: e } = site
  return (
    <section aria-labelledby="qp-every-age-title" className="border-t border-mist py-28 lg:py-40">
      <Column>
        <div className="text-center">
          <Kicker>{e.eyebrow}</Kicker>
          <H2 id="qp-every-age-title" className="mx-auto mt-6 max-w-[22ch]">
            <Words text={e.headline} />
          </H2>
          <Body className="mx-auto mt-8">{e.body}</Body>
        </div>

        <blockquote className="mx-auto my-20 max-w-[30ch] text-center font-display text-[length:clamp(2rem,4vw,3.5rem)] font-light italic leading-[1.2] text-balance text-ink lg:my-28">
          <p>{e.quote}</p>
        </blockquote>

        <ul className="grid gap-x-8 gap-y-16 md:grid-cols-2 lg:grid-cols-5">
          {e.tiers.map((t) => (
            <li key={t.name}>
              <Framed photo={photos[t.photo]} aspect="aspect-square" sizes="(min-width: 1024px) 14rem, (min-width: 768px) 50vw, 100vw" mat={false} />
              <p className="mt-6 font-display text-[2.5rem] font-normal leading-none lining-nums text-ember">{t.range}</p>
              <h3 className="mt-4 font-sans text-[0.7rem] font-medium uppercase leading-[1.8] tracking-[0.22em] text-ink">{t.name}</h3>
              <p className="mt-3 text-[0.9375rem] leading-[1.65] text-ink-soft">{t.body}</p>
            </li>
          ))}
        </ul>
      </Column>
    </section>
  )
}
