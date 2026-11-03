import { describe, expect, it } from "vitest"
import { safeNextPath } from "./next-path"

describe("safeNextPath", () => {
  it("keeps same-site admin paths", () => {
    expect(safeNextPath("/admin")).toBe("/admin")
    expect(safeNextPath("/admin/signups")).toBe("/admin/signups")
    expect(safeNextPath("/admin/signups?page=2")).toBe("/admin/signups?page=2")
  })

  it("percent-encodes non-ASCII so the redirect header stays valid", () => {
    const out = safeNextPath("/admin/\u2028x")
    expect(out).toBe("/admin/%E2%80%A8x")
    expect(/^[\x21-\x7e]+$/.test(out)).toBe(true)
  })

  it("falls back for everything else", () => {
    const bad = [
      undefined,
      null,
      "",
      "/",
      "/administrator",
      "//evil.example",
      "/admin//evil.example",
      "///admin",
      "https://evil.example/admin",
      "javascript:alert(1)",
      "/\\evil.example",
      "/admin\\..\\x",
      "/admin/\nx",
      "admin",
      "/other",
      "/admin/login",
      "/admin/login?next=/admin",
      "/admin/" + "a".repeat(600),
    ]
    for (const raw of bad) expect(safeNextPath(raw)).toBe("/admin")
  })
})
