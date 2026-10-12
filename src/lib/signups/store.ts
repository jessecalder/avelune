import type { DestinationValue } from "./types"
import { FileStore } from "./store.file"
import { PostgresStore } from "./store.postgres"

export type InsertInput = {
  email: string
  emailKey: string
  name?: string
  source?: string
  referrer?: string
  utm?: Record<string, string>
  landingPath?: string
  consentVersion: string
  ipHash?: string
  userAgent?: string
}

export type EnrichPatch = {
  childrenCount?: number
  childrenAges?: string
  destinations?: DestinationValue[]
  notes?: string
}

export type SignupRow = {
  id: string
  email: string
  emailKey: string
  name: string | null
  childrenCount: number | null
  childrenAges: string | null
  destinations: string[] | null
  notes: string | null
  source: string | null
  referrer: string | null
  utm: Record<string, string> | null
  landingPath: string | null
  status: "pending" | "confirmed" | "unsubscribed"
  confirmToken: string
  consentAt: Date
  consentVersion: string
  confirmedAt: Date | null
  ipHash: string | null
  userAgent: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SignupStore {
  insert(
    input: InsertInput,
  ): Promise<{ created: true; token: string } | { created: false }>
  enrich(token: string, patch: EnrichPatch): Promise<boolean>
  list(): Promise<SignupRow[]>
}

let store: SignupStore | undefined

export function getStore(): SignupStore {
  if (store) return store
  if (process.env.DATABASE_URL) {
    store = new PostgresStore()
  } else if (process.env.NODE_ENV === "production") {
    // Fail loudly: a container filesystem is discarded on redeploy, so a file
    // store in production would silently lose every lead.
    throw new Error("[signups] DATABASE_URL must be set in production")
  } else {
    console.warn(
      "[signups] DATABASE_URL not set — writing to .data/signups.jsonl",
    )
    store = new FileStore()
  }
  return store
}
