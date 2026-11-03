/** Customer-facing formatting for the /pay page: long month names, no times, no admin shorthand. */

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

const longDay = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" })
const monthName = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long" })
const pacificDay = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "long",
  day: "numeric",
})

function parseDay(day: string): { date: Date; year: number; month: number; dom: number } | null {
  const m = DAY.exec(day)
  if (!m) return null
  const date = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  return { date, year: Number(m[1]), month: Number(m[2]), dom: Number(m[3]) }
}

/** Calendar date "2026-11-17" → "November 17, 2026" (no time zone shift). */
export function payDay(day: string): string {
  const p = parseDay(day)
  return p ? longDay.format(p.date) : day
}

/** "July 10–19, 2027", "June 28 – July 7, 2027", or both full dates when the years differ. */
export function payRange(start: string, end: string): string {
  const a = parseDay(start)
  const b = parseDay(end)
  if (!a || !b) return `${start} – ${end}`
  if (start === end) return payDay(start)
  if (a.year === b.year && a.month === b.month) return `${monthName.format(a.date)} ${a.dom}–${b.dom}, ${a.year}`
  if (a.year === b.year) return `${monthName.format(a.date)} ${a.dom} – ${monthName.format(b.date)} ${b.dom}, ${a.year}`
  return `${payDay(start)} – ${payDay(end)}`
}

/** The day a payment was received, as the owner (Pacific time) sees it: "November 3, 2026". */
export function payPaidDay(paidAt: Date): string {
  return pacificDay.format(paidAt)
}

/** "$1,000.00" → whole "$1,000" and cents ".00", so the cents can be set smaller. No decimals → cents "". */
export function splitMoney(text: string): { whole: string; cents: string } {
  const m = /^(.*\d)([.,]\d{2})$/.exec(text)
  return m ? { whole: m[1], cents: m[2] } : { whole: text, cents: "" }
}
