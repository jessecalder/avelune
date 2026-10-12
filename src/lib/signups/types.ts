/**
 * Shared contract between the signup UI (client components) and the server
 * actions. Keep this file dependency-free: it is imported on both sides.
 */

/** Form field names used by both the hero form and the server action. */
export const JOIN_FIELDS = {
  email: "email",
  name: "name",
  /** Honeypot: must stay empty; bots fill it. Visually hidden, tabindex -1. */
  honeypot: "website",
  /** Where on the page the form lives: "hero" | "closing" | "nav". */
  source: "source",
  /** JSON string of utm_* params captured client-side from location.search. */
  utm: "utm",
  /** document.referrer captured client-side. */
  referrer: "referrer",
} as const

export const ENRICH_FIELDS = {
  token: "token",
  childrenCount: "childrenCount",
  childrenAges: "childrenAges",
  /** Checkbox group; values from DESTINATION_OPTIONS. */
  destinations: "destinations",
  notes: "notes",
} as const

export const DESTINATION_OPTIONS = [
  { value: "san-sebastian", label: "San Sebastián, Spain" },
  { value: "antigua", label: "Antigua, Guatemala" },
  { value: "anywhere", label: "Anywhere, as long as it's planned this well" },
] as const

export type DestinationValue = (typeof DESTINATION_OPTIONS)[number]["value"]

/** Exact consent sentence shown next to the form; stored with each signup. */
export const CONSENT_TEXT_VERSION = "2026-10-v1"

export type JoinState =
  | { status: "idle" }
  | { status: "error"; message: string; field?: "email" | "name" }
  /** First-time signup; `token` unlocks the optional "tell us about your family" step. */
  | { status: "joined"; token: string }
  /** Email already on the list; no token is returned on purpose. */
  | { status: "already" }

export type EnrichState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "saved" }

export const JOIN_INITIAL: JoinState = { status: "idle" }
export const ENRICH_INITIAL: EnrichState = { status: "idle" }
