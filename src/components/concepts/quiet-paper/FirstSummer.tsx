import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Body, Column, Framed, H2, Kicker, Words } from "./primitives"

export function FirstSummer() {
  const { firstSummer: s } = site
  return (
    <section aria-labelledby="qp-first-summer-title" className="border-t border-mist py-28 lg:py-40">
      <Column className="grid gap-y-14 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-y-16">
        <div className="lg:col-span-5 lg:col-start-1 lg:row-start-1">
          <Kicker>{s.eyebrow}</Kicker>
          <H2 id="qp-first-summer-title" className="mt-6">
            <Words text={s.headline} />
          </H2>
          <Body className="mt-8">{s.body}</Body>
        </div>

        <Framed
          photo={photos[s.photo]}
          aspect="aspect-[4/5]"
          sizes="(min-width: 1024px) 36rem, 28rem"
          className="mx-auto w-full max-w-[28rem] lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:max-w-none"
        />

        <div className="lg:col-span-5 lg:col-start-1 lg:row-start-2">
          <ul className="grid grid-cols-3 gap-4">
            {s.stats.map((stat) => (
              <li key={stat.label}>
                <p className="font-display text-[3rem] font-normal leading-none lining-nums text-ember sm:text-[3.5rem]">{stat.value}</p>
                <p className="mt-3 font-sans text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ink-soft">{stat.label}</p>
              </li>
            ))}
          </ul>

          <ol className="mt-14 border-b border-mist">
            {s.rhythm.map((r) => (
              <li key={r.title} className="border-t border-mist py-7">
                <h3 className="font-display text-[1.5rem] font-medium leading-[1.2] text-ink">{r.title}</h3>
                <p className="mt-3 text-[1rem] leading-[1.7] text-ink-soft">{r.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Column>
    </section>
  )
}
