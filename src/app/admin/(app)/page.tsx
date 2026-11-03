import type { ReactNode } from "react"
import { count, desc, gte, sql } from "drizzle-orm"
import type { Metadata } from "next"
import { Micro, NUMERAL } from "@/components/maison/primitives"
import { getDb } from "@/db/client"
import { reservations, signups } from "@/db/schema"
import { requireAdmin } from "@/lib/admin/auth"

export const metadata: Metadata = { title: "Overview" }

const DAY_MS = 24 * 60 * 60 * 1000

const pacific = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function formatPacific(d: Date): string {
  return `${pacific.format(d)} PT`
}

async function loadOverview() {
  const db = getDb()
  const since = new Date(Date.now() - 7 * DAY_MS)
  const [[total], [recent], byDestination, byStatus, latest] = await Promise.all([
    db.select({ n: count() }).from(signups),
    db.select({ n: count() }).from(signups).where(gte(signups.createdAt, since)),
    db.execute<{ destination: string; n: number }>(
      sql`select d as destination, count(*)::int as n from ${signups}, unnest(${signups.destinations}) as d group by d order by n desc, d`,
    ),
    db.select({ status: reservations.status, n: count() }).from(reservations).groupBy(reservations.status),
    db
      .select({ createdAt: signups.createdAt, email: signups.email, name: signups.name, source: signups.source })
      .from(signups)
      .orderBy(desc(signups.createdAt))
      .limit(10),
  ])
  return {
    total: total?.n ?? 0,
    recent: recent?.n ?? 0,
    byDestination: Array.from(byDestination),
    byStatus,
    latest,
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-t border-ink/40 pt-4">
      <Micro>{label}</Micro>
      <p className={`${NUMERAL} mt-3 text-[clamp(2.25rem,4vw,3.5rem)] text-ink`}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-16">
      <Micro tone="ink" className="mb-5">
        {title}
      </Micro>
      {children}
    </section>
  )
}

function Counts({ rows, empty }: { rows: { label: string; n: number }[]; empty: string }) {
  if (rows.length === 0) return <p className="font-sans text-[1.0625rem] text-stone">{empty}</p>
  return (
    <dl className="max-w-md border-t border-mist">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between border-b border-mist py-3">
          <dt className="font-sans text-[1.0625rem] text-ink-soft">{r.label}</dt>
          <dd className="font-sans text-[1.0625rem] tabular-nums text-ink">{r.n}</dd>
        </div>
      ))}
    </dl>
  )
}

export default async function AdminOverviewPage() {
  await requireAdmin()

  let data: Awaited<ReturnType<typeof loadOverview>> | null = null
  let failed = false
  if (process.env.DATABASE_URL) {
    try {
      data = await loadOverview()
    } catch (err) {
      console.error("admin overview query failed", err instanceof Error ? err.message : err)
      failed = true
    }
  }

  return (
    <>
      <h1 className="display text-[clamp(2.25rem,4.5vw,4rem)] text-ink">Overview</h1>

      {!process.env.DATABASE_URL ? (
        <p className="mt-10 font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">
          No database configured (local file store in use).
        </p>
      ) : failed || !data ? (
        <p role="alert" className="mt-10 font-sans text-[1.0625rem] leading-[1.75] text-ink-soft">
          The database could not be read. Check the server log.
        </p>
      ) : (
        <>
          <div className="mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-10">
            <Stat label="Signups" value={data.total} />
            <Stat label="Last 7 days" value={data.recent} />
          </div>

          <Section title="Interest by destination">
            <Counts
              rows={data.byDestination.map((r) => ({ label: r.destination, n: r.n }))}
              empty="No destination interest recorded yet."
            />
          </Section>

          <Section title="Deposit reservations">
            <Counts
              rows={data.byStatus.map((r) => ({ label: r.status, n: r.n }))}
              empty="No reservations yet."
            />
          </Section>

          <Section title="Latest signups">
            {data.latest.length === 0 ? (
              <p className="font-sans text-[1.0625rem] text-stone">No signups yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] border-t border-mist text-left font-sans text-[0.9375rem]">
                  <thead>
                    <tr className="border-b border-mist">
                      {["When (Pacific)", "Email", "Name", "Source"].map((h) => (
                        <th key={h} scope="col" className="py-3 pr-6 text-[0.6875rem] font-medium uppercase tracking-[0.28em] text-stone">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.latest.map((r) => (
                      <tr key={`${r.email}-${r.createdAt.toISOString()}`} className="border-b border-mist align-top">
                        <td className="whitespace-nowrap py-3 pr-6 text-ink-soft">{formatPacific(r.createdAt)}</td>
                        <td className="py-3 pr-6 break-all text-ink">{r.email}</td>
                        <td className="py-3 pr-6 text-ink-soft">{r.name ?? ""}</td>
                        <td className="py-3 pr-6 text-ink-soft">{r.source ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </>
  )
}
