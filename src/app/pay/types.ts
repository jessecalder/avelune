/** Client-safe pieces shared by the /pay server action and the pay button. */

export const PAY_FIELDS = { token: "token" } as const

export type PayState =
  | { status: "idle" }
  | { status: "error"; message: string }
  /** The payment changed under the family (paid, clearing, closed): reload the page so it says so. */
  | { status: "refresh" }

export const PAY_INITIAL: PayState = { status: "idle" }
