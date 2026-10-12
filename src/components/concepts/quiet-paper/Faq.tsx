import { site } from "@/content/site"
import { Body, Column, H2, Kicker, Words } from "./primitives"

export function Faq() {
  const { faq } = site
  return (
    <section aria-labelledby="qp-faq-title" className="py-28 lg:py-40">
      <Column>
        <div className="mx-auto max-w-[44rem]">
          <div className="text-center">
            <Kicker>{faq.eyebrow}</Kicker>
            <H2 id="qp-faq-title" className="mt-6">
              <Words text={faq.headline} />
            </H2>
            <Body className="mx-auto mt-8">{faq.body}</Body>
          </div>
          <div className="mt-16 border-b border-mist lg:mt-20">
            {faq.items.map((item) => (
              <details key={item.q} className="group border-t border-mist">
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-[1.375rem] font-medium leading-[1.3] text-ink">{item.q}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="size-4 shrink-0 translate-y-0.5 text-ember transition-transform duration-300 group-open:rotate-45"
                  >
                    <path d="M8 1v14M1 8h14" stroke="currentColor" strokeWidth="1" fill="none" />
                  </svg>
                </summary>
                <p className="max-w-[60ch] pb-7 pr-10 text-[1rem] leading-[1.7] text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Column>
    </section>
  )
}
