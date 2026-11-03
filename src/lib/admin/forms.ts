/**
 * Shared helpers for admin server actions: one result shape, form-field readers that turn
 * empty inputs into null, and plain-English messages for the database's refusals (unique keys,
 * restrict rules, checks, triggers). Server-only in practice; holds no secrets.
 */

export type FormState =
  | { status: "idle" }
  | { status: "saved"; message?: string }
  | { status: "error"; message: string; field?: string }

export const FORM_IDLE: FormState = { status: "idle" }

export function saved(message?: string): FormState {
  return { status: "saved", message }
}

export function failed(message: string, field?: string): FormState {
  return { status: "error", message, field }
}

/** Trimmed string, or null when the field is missing or blank. */
export function text(fd: FormData, name: string, max = 2000): string | null {
  const v = fd.get(name)
  if (typeof v !== "string") return null
  const t = v.trim()
  if (t === "") return null
  return t.slice(0, max)
}

/** Like text(), but a blank value is an error the caller reports. */
export function requiredText(fd: FormData, name: string, max = 500): string | undefined {
  return text(fd, name, max) ?? undefined
}

/** One of the allowed values, or null. */
export function oneOf<T extends string>(fd: FormData, name: string, allowed: readonly T[]): T | null {
  const v = text(fd, name, 100)
  return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : null
}

/** Checkbox: present and "on"/"true" means true. */
export function bool(fd: FormData, name: string): boolean {
  const v = fd.get(name)
  return v === "on" || v === "true" || v === "1"
}

/** Whole number, or null when blank; undefined when present but not a whole number. */
export function int(fd: FormData, name: string): number | null | undefined {
  const v = text(fd, name, 30)
  if (v === null) return null
  const n = Number(v.replace(/,/g, ""))
  return Number.isInteger(n) ? n : undefined
}

/**
 * Money typed as dollars ("1,250" or "1250.5") → integer cents. null when blank, undefined when
 * it is not a number with at most two decimals.
 */
export function cents(fd: FormData, name: string): number | null | undefined {
  const v = text(fd, name, 30)
  if (v === null) return null
  const cleaned = v.replace(/[,$€\s]/g, "")
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return undefined
  return Math.round(Number(cleaned) * 100)
}

/** Calendar date "YYYY-MM-DD" (from <input type="date">), or null; undefined when malformed. */
export function date(fd: FormData, name: string): string | null | undefined {
  const v = text(fd, name, 40)
  if (v === null) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined
}

/**
 * <input type="datetime-local"> value read as Pacific time → Date. null when blank.
 * The admin works in Pacific time; the offset is resolved for that wall-clock date.
 */
export function pacificDateTime(fd: FormData, name: string): Date | null | undefined {
  const v = text(fd, name, 40)
  if (v === null) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v)
  if (!m) return undefined
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[]
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const offsetMin = pacificOffsetMinutes(new Date(guess))
  return new Date(guess - offsetMin * 60_000)
}

/**
 * The last millisecond of a calendar date "YYYY-MM-DD" in Pacific time: "works until the end of
 * that day". An Invalid Date when the text is not a real calendar date.
 */
export function pacificEndOfDay(day: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day)
  if (!m) return new Date(NaN)
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const wall = new Date(Date.UTC(y, mo - 1, d, 23, 59))
  if (wall.getUTCFullYear() !== y || wall.getUTCMonth() !== mo - 1 || wall.getUTCDate() !== d) return new Date(NaN)
  // 23:59 is on the same side of a daylight-saving change as the wall-clock instant it stands for.
  // The offset is read at the whole minute (it has minute resolution), then the last 59.999 s are added.
  return new Date(wall.getTime() - pacificOffsetMinutes(wall) * 60_000 + 59_999)
}

function pacificOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"))
  return Math.round((asUtc - at.getTime()) / 60_000)
}

/** Lowercase three-letter currency code, or null. */
export function currency(fd: FormData, name: string): string | null | undefined {
  const v = text(fd, name, 20)
  if (v === null) return null
  const c = v.toLowerCase()
  return /^[a-z]{3}$/.test(c) ? c : undefined
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}

type PgLike = { code?: string; constraint_name?: string; constraint?: string; message?: string; detail?: string }

function pgError(err: unknown): PgLike | null {
  if (!err || typeof err !== "object") return null
  const e = err as PgLike & { cause?: unknown }
  if (typeof e.code === "string" && /^[0-9A-Z]{5}$/.test(e.code)) return e
  if (e.cause) return pgError(e.cause)
  return null
}

/**
 * Turns a database refusal into a sentence for the owner. Callers pass their own wording for
 * the constraints they expect; anything unknown gets a generic line and is logged.
 */
export function dbMessage(err: unknown, known: Record<string, string> = {}): string {
  const pg = pgError(err)
  if (!pg) {
    console.error("[admin] unexpected error:", err)
    return "Something went wrong saving that. Try again."
  }
  const name = pg.constraint_name ?? pg.constraint ?? ""
  if (name && known[name]) return known[name]
  // The booking_travellers trigger raises check_violation without a constraint name.
  if (pg.code === "23514" && /does not belong to the family/.test(pg.message ?? "")) {
    return "That person isn't in this booking's family. Add travellers from the family's own list."
  }
  switch (pg.code) {
    case "23505":
      return "That would duplicate an existing record."
    case "23503":
      return "Other records still point at this one, so it can't be removed. Remove or move those first."
    case "23514":
      return "That combination isn't allowed. Check the dates, amounts and required fields."
    case "23502":
      return "A required field is missing."
    case "P0001":
      return pg.message ?? "The database refused that change."
    case "22P02":
    case "22007":
    case "22008":
      return "One of the values isn't in the right format."
    default:
      console.error("[admin] database error:", pg.code, name, pg.message)
      return "The database refused that change."
  }
}
