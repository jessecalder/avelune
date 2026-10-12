/** Safe to import from client components: no server code here. */

export type DepositState =
  | { status: "idle" }
  | { status: "closed" }
  | { status: "error"; message: string }

export const DEPOSIT_INITIAL: DepositState = { status: "idle" }

export const DEPOSIT_FIELDS = {
  email: "email",
  journey: "journey",
  token: "token",
} as const

export const JOURNEY_IDS = ["san-sebastian", "antigua"] as const
export type JourneyId = (typeof JOURNEY_IDS)[number]
