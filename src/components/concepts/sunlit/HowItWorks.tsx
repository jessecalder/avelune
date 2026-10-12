import { site } from "@/content/site"
import { Container } from "@/components/ui"
import { BIG_NUM, BODY, Eyebrow, H2, H3, Headline } from "./parts"

export function HowItWorks() {
  const h = site.howItWorks
  return (
    <section aria-labelledby="sunlit-how" className="bg-bone py-16 lg:py-24">
      <Container>
        <Eyebrow className="text-stone">{h.eyebrow}</Eyebrow>
        <div className="mt-5 grid gap-6 lg:grid-cols-12 lg:gap-12">
          <h2 id="sunlit-how" className={`${H2} reveal lg:col-span-7`}>
            <Headline text={h.headline} />
          </h2>
          <p className={`${BODY} text-ink-soft lg:col-span-5 lg:self-end`}>{h.body}</p>
        </div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:gap-6">
          {h.pillars.map((p, i) => (
            <li key={p.title} className="reveal rounded-[1.5rem] bg-bone-deep p-6 lg:p-10">
              <span aria-hidden="true" className={`${BIG_NUM} block text-[5rem] text-cacao lg:text-[8rem]`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className={`${H3} mt-4 lg:mt-6`}>{p.title}</h3>
              <p className={`${BODY} mt-3 text-ink-soft`}>{p.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
