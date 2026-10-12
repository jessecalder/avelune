import { SignupForm } from "@/components/signup/SignupForm"
import { photos } from "@/content/photos"
import { site } from "@/content/site"
import { Body, Column, Framed, H2, Kicker, Words } from "./primitives"

/** Hairlines here are moon, not mist: mist is invisible against bone-deep. */
export function Founding() {
  const { founding: f } = site
  return (
    <section aria-labelledby="qp-founding-title" className="bg-bone-deep py-28 lg:py-40">
      <Column>
        <div className="text-center">
          <Kicker>{f.eyebrow}</Kicker>
          <H2 id="qp-founding-title" className="mx-auto mt-6 max-w-[22ch]">
            <Words text={f.headline} />
          </H2>
          <Body className="mx-auto mt-8">{f.body}</Body>
        </div>

        <Framed
          photo={photos[f.photo]}
          aspect="aspect-[3/2]"
          sizes="(min-width: 1024px) 48rem, 100vw"
          className="mx-auto mt-20 max-w-[48rem] lg:mt-28"
        />

        <ol className="mx-auto mt-20 max-w-[56rem] border-b border-moon lg:mt-28">
          {f.perks.map((p, i) => (
            <li key={p.title} className="grid gap-x-10 gap-y-3 border-t border-moon py-8 lg:grid-cols-12">
              <span aria-hidden="true" className="font-display text-[1.5rem] font-light leading-[1.2] lining-nums text-ember lg:col-span-1">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-display text-[1.5rem] font-medium leading-[1.2] text-ink lg:col-span-4">{p.title}</h3>
              <p className="text-[1rem] leading-[1.7] text-ink-soft lg:col-span-7">{p.body}</p>
            </li>
          ))}
        </ol>

        <div className="mx-auto mt-20 max-w-[36rem] border border-moon bg-bone p-6 sm:p-10 lg:mt-28">
          <SignupForm source="founding" variant="light" cta={f.form.cta} microcopy={f.form.microcopy} />
        </div>
      </Column>
    </section>
  )
}
