import { SignupForm } from "@/components/signup/SignupForm"
import { site } from "@/content/site"
import { Column, FORM_SKIN, H3_SIZE, Label, pad, SectionHead } from "./primitives"

export function Founding() {
  const { founding: f } = site
  return (
    <section id="founding" aria-labelledby="nocturne-founding-title" className="bg-ink py-28 lg:py-44">
      <Column>
        <SectionHead id="nocturne-founding-title" eyebrow={f.eyebrow} headline={f.headline} body={f.body} h2Class="max-w-[16ch]" />

        <ol className="mx-auto mt-20 max-w-[44rem] border-b border-mist lg:mt-28">
          {f.perks.map((p, i) => (
            <li key={p.title} className="reveal border-t border-mist py-12 text-center">
              <Label aria-hidden="true" as="span">
                {pad(i + 1)}
              </Label>
              <h3 className={`${H3_SIZE} mt-5 text-bone`}>{p.title}</h3>
              <p className="mx-auto mt-4 max-w-[48ch] font-sans text-[1.0625rem] leading-[1.75] text-bone/85">{p.body}</p>
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-24 max-w-[44rem] border border-mist p-8 lg:mt-32 lg:p-12">
          <div className={FORM_SKIN}>
            <SignupForm source="founding" variant="dark" cta={f.form.cta} microcopy={f.form.microcopy} />
          </div>
        </div>
      </Column>
    </section>
  )
}
