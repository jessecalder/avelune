import { z } from "zod"
import { DESTINATION_OPTIONS, type DestinationValue } from "./types"

const EMAIL_ERROR = "Enter a valid email address."

export function normalizeEmail(raw: string): { email: string; emailKey: string } {
  const email = raw.trim()
  return { email, emailKey: email.toLowerCase() }
}

/** Browsers send "" for untouched inputs; treat that as absent. */
function blankToUndefined(v: unknown): unknown {
  return v === null || (typeof v === "string" && v.trim() === "") ? undefined : v
}

function optionalText(max: number, error?: string) {
  return z
    .preprocess(
      blankToUndefined,
      z.string().trim().max(max, error ? { error } : undefined).optional(),
    )
    .transform((v) => (v === "" ? undefined : (v as string | undefined)))
}

function parseUtm(raw: string | undefined): Record<string, string> | undefined {
  if (!raw) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return undefined
  }
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (!key.startsWith("utm_") || key.length > 40) continue
    if (typeof value !== "string" || value.length > 200) continue
    out[key] = value
    if (Object.keys(out).length >= 10) break
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export const joinSchema = z.object({
  email: z
    .string({ error: EMAIL_ERROR })
    .trim()
    .max(254, { error: EMAIL_ERROR })
    .pipe(z.email({ error: EMAIL_ERROR })),
  name: optionalText(80, "Please keep your name under 80 characters."),
  // Telemetry fields never block a signup: bad values are dropped or truncated.
  source: z
    .preprocess(
      blankToUndefined,
      z
        .string()
        .max(40)
        .regex(/^[a-z-]+$/)
        .optional(),
    )
    .catch(undefined),
  utm: z
    .preprocess(blankToUndefined, z.string().optional())
    .transform((v) => parseUtm(v as string | undefined)),
  referrer: z
    .preprocess(
      blankToUndefined,
      z
        .string()
        .transform((v) => v.slice(0, 500))
        .optional(),
    )
    .catch(undefined),
})

export type JoinInput = z.output<typeof joinSchema>

const DESTINATION_VALUES = DESTINATION_OPTIONS.map((o) => o.value) as [
  DestinationValue,
  ...DestinationValue[],
]

export const enrichSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{48}$/),
  childrenCount: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(0).max(12).optional(),
  ),
  childrenAges: optionalText(120),
  destinations: z
    .array(z.enum(DESTINATION_VALUES))
    .optional()
    .transform((v) => (v ? [...new Set(v)] : undefined)),
  notes: optionalText(500),
})

export type EnrichInput = z.output<typeof enrichSchema>

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "yopmail.com",
  "tempmail.com",
  "trashmail.com",
  "sharklasers.com",
  "dispostable.com",
  "getnada.com",
  "maildrop.cc",
])

export function isDisposableEmail(emailKey: string): boolean {
  const at = emailKey.lastIndexOf("@")
  if (at < 0) return false
  return DISPOSABLE_DOMAINS.has(emailKey.slice(at + 1).trim().toLowerCase())
}
