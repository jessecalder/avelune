import { site } from "@/content/site"
import { photos } from "@/content/photos"
import { Container } from "@/components/ui"
import { Photo } from "@/components/Photo"
import { BIG_NUM, BODY, Eyebrow, H2, H3, Headline } from "./parts"

export function FirstSummer() {
  const s = site.firstSummer
  return (
    <section aria-labelledby="sunlit-first-summer" className="py-16 lg:py-24">
      <Container>
        <div className="rounded-[2.5rem] bg-bone-deep p-6 sm:p-8 lg:p-16">
          <Eyebrow className="text-stone">{s.eyebrow}</Eyebrow>
          <h2 id="sunlit-first-summer" className={`${H2} reveal mt-5 max-w-[22ch]`}>
            <Headline text={s.headline} />
          </h2>
          <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <p className={`${BODY} max-w-[62ch] text-ink-soft`}>{s.body}</p>
              <ul className="mt-8 grid grid-cols-3 gap-3">
                {s.stats.map((st) => (
                  <li key={st.label} className="rounded-[1.5rem] bg-moon px-3 py-4 text-ink sm:px-5 sm:py-5">
                    <span className="block font-display text-[2.25rem] font-extrabold leading-none tracking-[-0.03em] sm:text-[3.5rem]">
                      {st.value}
                    </span>
                    <span className="mt-1 block text-[0.9375rem] font-semibold">{st.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] lg:col-span-5 lg:rounded-[2.5rem]">
              <Photo photo={photos[s.photo]} sizes="(min-width: 1024px) 40vw, 100vw" />
            </div>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-3 lg:mt-12 lg:gap-6">
            {s.rhythm.map((r, i) => (
              <li key={r.title} className="reveal rounded-[1.5rem] bg-bone p-6 lg:p-8">
                <span aria-hidden="true" className={`${BIG_NUM} block text-ember`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className={`${H3} mt-4`}>{r.title}</h3>
                <p className={`${BODY} mt-3 text-ink-soft`}>{r.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  )
}
