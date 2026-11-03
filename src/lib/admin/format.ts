/** Display formatting for the admin. Everything is shown in Pacific time. */

const TZ = "America/Los_Angeles"

const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" })

/** Timestamp → "Nov 3, 2026, 4:12 PM PT". */
export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  return Number.isNaN(date.getTime()) ? "—" : `${dateTimeFmt.format(date)} PT`
}

/** Calendar date "2027-07-10" → "Jul 10, 2027" (no time zone shift). */
export function formatDay(d: string | null | undefined): string {
  if (!d) return "—"
  const date = new Date(`${d}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? "—" : dayFmt.format(date)
}

/** "Jul 10 – Jul 19, 2027" for a date range. */
export function formatRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "—"
  if (!end) return formatDay(start)
  if (!start) return formatDay(end)
  return `${formatDay(start)} – ${formatDay(end)}`
}

/** Integer cents + currency → "$1,250.00" / "€980.00" / "GTQ 1,200.00". */
export function formatMoney(centsValue: number | null | undefined, currencyCode = "usd"): string {
  if (centsValue === null || centsValue === undefined) return "—"
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode.toUpperCase() }).format(centsValue / 100)
  } catch {
    return `${currencyCode.toUpperCase()} ${(centsValue / 100).toFixed(2)}`
  }
}

/** Cents → the plain number a money input expects ("1250.00"), or "" for null. */
export function centsToInput(centsValue: number | null | undefined): string {
  return centsValue === null || centsValue === undefined ? "" : (centsValue / 100).toFixed(2)
}

/** Date → value for <input type="datetime-local"> in Pacific time. */
export function toPacificInput(d: Date | string | null | undefined): string {
  if (!d) return ""
  const date = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00"
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`
}

/** snake_case enum value → "Sentence case". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—"
  const s = value.replace(/^age_/, "").replace(/_/g, " ").replace(/^(\d+) (\d+)$/, "$1–$2")
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const AGE_BAND_LABELS: Record<string, string> = {
  under_3: "Under 3",
  age_3_5: "3–5 · The Small Ones",
  age_6_9: "6–9 · The Explorers",
  age_10_13: "10–13 · The Crew",
  age_14_17: "14–17 · The Residents",
  adult: "Adult",
}

export const JOURNEY_LABELS: Record<string, string> = {
  "san-sebastian": "San Sebastián",
  antigua: "Antigua",
}
