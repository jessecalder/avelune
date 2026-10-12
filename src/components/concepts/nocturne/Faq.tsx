import { site } from "@/content/site"
import { Column, SectionHead } from "./primitives"

export function Faq() {
  const { faq } = site
  return (
    <section aria-labelledby="nocturne-faq-title" className="bg-ink pb-28 lg:pb-44">
      <Column>
        <div className="border-t border-mist pt-28 lg:pt-44">
          <SectionHead id="nocturne-faq-title" eyebrow={faq.eyebrow} headline={faq.headline} h2Class="max-w-[18ch]" />
        </div>
        <div className="mx-auto mt-16 max-w-[44rem] border-b border-mist lg:mt-24">
          {faq.items.map((item) => (
            <details key={item.q} className="group border-t border-mist">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-7 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-[1.25rem] leading-[1.35] text-bone lg:text-[1.5rem]">{item.q}</span>
                <span
                  aria-hidden="true"
                  className="font-display text-[1.5rem] leading-none text-moon transition-transform duration-500 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="max-w-[56ch] pb-9 pr-10 font-sans text-[1.0625rem] leading-[1.75] text-bone/80">{item.a}</p>
            </details>
          ))}
        </div>
      </Column>
    </section>
  )
}
