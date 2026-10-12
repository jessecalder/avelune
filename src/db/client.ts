import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

type Db = PostgresJsDatabase<typeof schema>
type Cache = { sql?: ReturnType<typeof postgres>; db?: Db }

// Cached on globalThis outside production so HMR doesn't leak connections.
const globalCache = globalThis as typeof globalThis & { __avelune_db?: Cache }
const cache: Cache =
  process.env.NODE_ENV === "production"
    ? {}
    : (globalCache.__avelune_db ??= {})

export function getDb(): Db {
  if (cache.db) return cache.db
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error("DATABASE_URL is not set; cannot connect to Postgres.")
  }
  // prepare: false keeps this compatible with transaction-mode poolers (Supabase, pgbouncer).
  const sql = postgres(url, { prepare: false, max: 5 })
  cache.sql = sql
  cache.db = drizzle(sql, { schema })
  return cache.db
}

export async function closeDb(): Promise<void> {
  const sql = cache.sql
  cache.sql = undefined
  cache.db = undefined
  if (sql) await sql.end({ timeout: 5 })
}
