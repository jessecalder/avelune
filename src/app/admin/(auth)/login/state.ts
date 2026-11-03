/** Shared by the login action (server) and the form (client); no server code here. */
export type LoginState = { status: "idle" } | { status: "error"; message: string }

export const LOGIN_INITIAL: LoginState = { status: "idle" }

export const LOGIN_FIELDS = { password: "password", next: "next" } as const
