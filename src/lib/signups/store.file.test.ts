import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FileStore } from "./store.file"

let dir: string
let store: FileStore

const base = {
  email: "Ann@Example.com",
  emailKey: "ann@example.com",
  consentVersion: "v1",
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "avelune-signups-"))
  store = new FileStore(join(dir, "nested", "signups.jsonl"))
})

afterEach(async () => {
  vi.useRealTimers()
  await rm(dir, { recursive: true, force: true })
})

describe("FileStore", () => {
  it("inserts and returns a 48-char hex token, creating the directory", async () => {
    const r = await store.insert({ ...base, name: "Ann", source: "hero" })
    expect(r.created).toBe(true)
    if (r.created) expect(r.token).toMatch(/^[a-f0-9]{48}$/)
    const rows = await store.list()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      email: "Ann@Example.com",
      name: "Ann",
      source: "hero",
      status: "pending",
      childrenCount: null,
    })
  })

  it("reports duplicates by emailKey without writing", async () => {
    await store.insert(base)
    const dup = await store.insert({ ...base, email: "ANN@example.com" })
    expect(dup).toEqual({ created: false })
    expect(await store.list()).toHaveLength(1)
  })

  it("enriches by token and rejects unknown tokens", async () => {
    const r = await store.insert(base)
    if (!r.created) throw new Error("expected created")
    const ok = await store.enrich(r.token, {
      childrenCount: 3,
      childrenAges: "4, 7, 11",
      destinations: ["antigua"],
    })
    expect(ok).toBe(true)
    const [row] = await store.list()
    expect(row).toMatchObject({
      childrenCount: 3,
      childrenAges: "4, 7, 11",
      destinations: ["antigua"],
      notes: null,
    })
    expect(await store.enrich("f".repeat(48), { notes: "x" })).toBe(false)
  })

  it("lists newest first and round-trips dates", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-01T10:00:00Z"))
    await store.insert({ ...base, email: "a@x.com", emailKey: "a@x.com" })
    vi.setSystemTime(new Date("2026-10-02T10:00:00Z"))
    await store.insert({ ...base, email: "b@x.com", emailKey: "b@x.com" })
    const rows = await store.list()
    expect(rows.map((r) => r.emailKey)).toEqual(["b@x.com", "a@x.com"])
    expect(rows[0].createdAt).toBeInstanceOf(Date)
    expect(rows[0].createdAt.toISOString()).toBe("2026-10-02T10:00:00.000Z")
    expect(rows[1].consentAt.toISOString()).toBe("2026-10-01T10:00:00.000Z")
  })

  it("returns an empty list when the file does not exist", async () => {
    expect(await store.list()).toEqual([])
  })
})
