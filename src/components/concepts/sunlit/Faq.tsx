import { site } from "@/content/site"
import { Container } from "@/components/ui"
import { BODY, Eyebrow, H2, Headline } from "./parts"

export function Faq() {
  const q = site.faq
  return (
    <section aria-labelledby="sunlit-faq" className="bg-bone pb-16 lg:pb-24">
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24">
            <Eyebrow className="text-stone">{q.eyebrow}</Eyebrow>
            <h2 id="sunlit-faq" className={`${H2} mt-5`}>
              <Headline text={q.headline} />
            </h2>
            <p className={`${BODY} mt-6 max-w-[40ch] text-ink-soft`}>{q.body}</p>
          </div>
        </div>
        <div className="grid content-start gap-3 lg:col-span-7">
          {q.items.map((item) => (
            <details key={item.q} className="group rounded-[1.25rem] bg-bone-deep">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[1.25rem] p-5 lg:p-6 [&::-webkit-details-marker]:hidden">
                <h3 className="font-display text-[1.1875rem] font-semibold leading-[1.2] lg:text-[1.375rem] [font-variation-settings:'opsz'_36,'wdth'_100]">
                  {item.q}
                </h3>
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-ember text-[1.5rem] font-semibold leading-none text-ink transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className={`${BODY} px-5 pb-6 text-ink-soft lg:px-6`}>{item.a}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  )
}
