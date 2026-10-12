import { randomBytes } from "node:crypto"
import { desc, eq } from "drizzle-orm"
import { getDb } from "../../db/client"
import { signups } from "../../db/schema"
import type { EnrichPatch, InsertInput, SignupRow, SignupStore } from "./store"

export class PostgresStore implements SignupStore {
  async insert(
    input: InsertInput,
  ): Promise<{ created: true; token: string } | { created: false }> {
    const token = randomBytes(24).toString("hex")
    const rows = await getDb()
      .insert(signups)
      .values({ ...input, confirmToken: token })
      .onConflictDoNothing({ target: signups.emailKey })
      .returning({ token: signups.confirmToken })
    return rows.length > 0 ? { created: true, token: rows[0].token } : { created: false }
  }

  async enrich(token: string, patch: EnrichPatch): Promise<boolean> {
    const rows = await getDb()
      .update(signups)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(signups.confirmToken, token))
      .returning({ id: signups.id })
    return rows.length > 0
  }

  async list(): Promise<SignupRow[]> {
    return getDb().select().from(signups).orderBy(desc(signups.createdAt))
  }
}
