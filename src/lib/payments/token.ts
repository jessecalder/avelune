import { randomBytes } from "node:crypto"

const LINK_TOKEN = /^[A-Za-z0-9_-]{43}$/

/** 32 random bytes as base64url: 43 characters, unguessable. */
export function newLinkToken(): string {
  return randomBytes(32).toString("base64url")
}

/** Shape check only; whether a link exists for the token is the store's answer. */
export function isLinkToken(v: unknown): v is string {
  return typeof v === "string" && LINK_TOKEN.test(v)
}
