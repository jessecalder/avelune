import Link from "next/link"
import type { ReactNode } from "react"
import { MICRO_CLASS } from "@/components/maison/primitives"

/**
 * Presentational building blocks for admin pages, in the Maison register: ivory ground,
 * charcoal type, hairlines, no rounded corners, no shadows. Server-safe (no hooks).
 */

export const BUTTON_CLASS = `${MICRO_CLASS} inline-flex h-11 items-center justify-center gap-2 bg-ink px-5 text-bone transition-colors hover:bg-ink-soft disabled:opacity-60`
export const BUTTON_QUIET_CLASS = `${MICRO_CLASS} inline-flex h-11 items-center justify-center gap-2 border border-ink/40 px-5 text-ink transition-colors hover:border-ink disabled:opacity-60`
export const LINK_CLASS = "text-ink underline decoration-ink/30 underline-offset-4 transition-colors hover:decoration-ink"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: string
  title: string
  description?: ReactNode
  actions?: ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-6 border-b border-mist pb-8">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} className={`${MICRO_CLASS} text-stone hover:text-ink`}>
            ← {back.label}
          </Link>
        ) : null}
        {eyebrow ? <p className={`${MICRO_CLASS} mt-3 text-stone`}>{eyebrow}</p> : null}
        <h1 className="mt-2 font-display text-[clamp(1.875rem,3vw,2.75rem)] leading-[1.1] text-ink">{title}</h1>
        {description ? <div className="mt-3 max-w-[70ch] text-[0.9375rem] leading-[1.6] text-ink-soft">{description}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  )
}

export function Section({ title, description, actions, children }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-mist pb-3">
        <div>
          <h2 className="font-display text-[1.375rem] leading-tight text-ink">{title}</h2>
          {description ? <p className="mt-1 text-[0.875rem] text-stone">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** A plain data table. `columns` are header labels; rows are arrays of cells. */
export function Table({ columns, rows, empty = "Nothing here yet." }: { columns: ReactNode[]; rows: ReactNode[][]; empty?: string }) {
  if (rows.length === 0) return <Empty>{empty}</Empty>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-[0.9375rem]">
        <thead>
          <tr className="border-b border-ink/30">
            {columns.map((c, i) => (
              <th key={i} scope="col" className={`${MICRO_CLASS} whitespace-nowrap py-3 pr-6 font-medium text-stone`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, r) => (
            <tr key={r} className="border-b border-mist align-top">
              {cells.map((cell, c) => (
                <td key={c} className="py-3 pr-6 text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-mist px-5 py-6 text-[0.9375rem] text-stone">{children}</p>
}

/** Small uppercase status label. `tone` picks emphasis only; colour stays in the Maison palette. */
export function Badge({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "strong" | "muted" }) {
  const cls =
    tone === "strong" ? "border-ink bg-ink text-bone" : tone === "muted" ? "border-mist text-stone" : "border-ink/40 text-ink"
  return <span className={`${MICRO_CLASS} inline-block whitespace-nowrap border px-2 py-0.5 leading-[1.6] ${cls}`}>{children}</span>
}

/** Definition list for record details. */
export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="border-t border-mist pt-3">
          <dt className={`${MICRO_CLASS} text-stone`}>{it.label}</dt>
          <dd className="mt-1 break-words text-[0.9375rem] text-ink">{it.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Big number with a label, for summary rows. */
export function Stat({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="border-t border-ink/40 pt-3">
      <p className={`${MICRO_CLASS} text-stone`}>{label}</p>
      <p className="mt-2 font-display text-[2rem] leading-none text-ink lining-nums">{value}</p>
      {note ? <p className="mt-2 text-[0.8125rem] text-stone">{note}</p> : null}
    </div>
  )
}

export function ButtonLink({ href, children, quiet = false }: { href: string; children: ReactNode; quiet?: boolean }) {
  return (
    <Link href={href} className={quiet ? BUTTON_QUIET_CLASS : BUTTON_CLASS}>
      {children}
    </Link>
  )
}

/** GET search/filter bar: renders a plain form so filters live in the URL. */
export function FilterBar({ action, children }: { action: string; children: ReactNode }) {
  return (
    <form action={action} method="get" className="mt-8 flex flex-wrap items-end gap-4">
      {children}
      <button type="submit" className={BUTTON_QUIET_CLASS}>
        Filter
      </button>
    </form>
  )
}

/** Notice for things the owner must not do yet (privacy gates and similar). */
export function Notice({ children }: { children: ReactNode }) {
  return <p className="border-l-2 border-ink/50 bg-bone-deep px-4 py-3 text-[0.875rem] leading-[1.6] text-ink-soft">{children}</p>
}
