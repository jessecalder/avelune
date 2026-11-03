import { PrivateShell } from "@/components/maison/PrivateShell"
import { MICRO_CLASS } from "@/components/maison/primitives"
import { site } from "@/content/site"
import { PAY_COLUMN_CLASS } from "./parts"

/** A link that is mistyped, cut short or unknown. It says nothing about which. */
export default function PayNotFound() {
  return (
    <PrivateShell>
      <div className={`${PAY_COLUMN_CLASS} py-20 text-center sm:py-32`}>
        <p className={`${MICRO_CLASS} pl-[0.28em] text-stone`}>{site.pay.eyebrow}</p>
        <h1 className="mx-auto mt-6 max-w-[16ch] font-display text-[clamp(2.25rem,5vw,3.5rem)] font-normal leading-[1.05] tracking-[-0.01em] text-balance text-ink">
          {site.pay.notFound.title}
        </h1>
        <p className="mx-auto mt-8 max-w-[40ch] font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">{site.pay.notFound.body}</p>
        <a
          href={`mailto:${site.contactEmail}`}
          className="mt-10 inline-flex h-14 w-full items-center justify-center rounded-none border border-ink px-6 font-sans text-[0.6875rem] font-medium uppercase tracking-[0.24em] text-ink transition-colors hover:bg-ink hover:text-bone"
        >
          {site.pay.writeToUs}
        </a>
      </div>
    </PrivateShell>
  )
}
