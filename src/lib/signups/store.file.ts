import { randomBytes } from "node:crypto"
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { EnrichPatch, InsertInput, SignupRow, SignupStore } from "./store"

type StoredRow = Omit<SignupRow, "consentAt" | "confirmedAt" | "createdAt" | "updatedAt"> & {
  consentAt: string
  confirmedAt: string | null
  createdAt: string
  updatedAt: string
}

function toRow(r: StoredRow): SignupRow {
  return {
    ...r,
    consentAt: new Date(r.consentAt),
    confirmedAt: r.confirmedAt ? new Date(r.confirmedAt) : null,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  }
}

/** Dev-only JSONL store. Enrich rewrites the whole file; writes are serialized per process. */
export class FileStore implements SignupStore {
  private queue: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly path: string = process.env.SIGNUP_FILE_PATH ??
      ".data/signups.jsonl",
  ) {}

  private serialize<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task)
    this.queue = run.catch(() => undefined)
    return run
  }

  private async readAll(): Promise<StoredRow[]> {
    let raw: string
    try {
      raw = await readFile(this.path, "utf8")
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return []
      throw err
    }
    return raw
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => JSON.parse(line) as StoredRow)
  }

  insert(
    input: InsertInput,
  ): Promise<{ created: true; token: string } | { created: false }> {
    return this.serialize(async () => {
      const rows = await this.readAll()
      if (rows.some((r) => r.emailKey === input.emailKey)) {
        return { created: false as const }
      }
      const token = randomBytes(24).toString("hex")
      const now = new Date().toISOString()
      const row: StoredRow = {
        id: crypto.randomUUID(),
        email: input.email,
        emailKey: input.emailKey,
        name: input.name ?? null,
        childrenCount: null,
        childrenAges: null,
        destinations: null,
        notes: null,
        source: input.source ?? null,
        referrer: input.referrer ?? null,
        utm: input.utm ?? null,
        landingPath: input.landingPath ?? null,
        status: "pending",
        confirmToken: token,
        consentAt: now,
        consentVersion: input.consentVersion,
        confirmedAt: null,
        ipHash: input.ipHash ?? null,
        userAgent: input.userAgent ?? null,
        createdAt: now,
        updatedAt: now,
      }
      await mkdir(dirname(this.path), { recursive: true })
      await appendFile(this.path, JSON.stringify(row) + "\n", "utf8")
      return { created: true as const, token }
    })
  }

  enrich(token: string, patch: EnrichPatch): Promise<boolean> {
    return this.serialize(async () => {
      const rows = await this.readAll()
      const row = rows.find((r) => r.confirmToken === token)
      if (!row) return false
      if (patch.name !== undefined) row.name = patch.name
      if (patch.childrenCount !== undefined) row.childrenCount = patch.childrenCount
      if (patch.childrenAges !== undefined) row.childrenAges = patch.childrenAges
      if (patch.destinations !== undefined) row.destinations = patch.destinations
      if (patch.notes !== undefined) row.notes = patch.notes
      row.updatedAt = new Date().toISOString()
      await mkdir(dirname(this.path), { recursive: true })
      await writeFile(
        this.path,
        rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
        "utf8",
      )
      return true
    })
  }

  async list(): Promise<SignupRow[]> {
    const rows = await this.serialize(() => this.readAll())
    // Reverse first so rows written in the same millisecond keep newest-first order.
    return rows
      .map(toRow)
      .reverse()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
}
