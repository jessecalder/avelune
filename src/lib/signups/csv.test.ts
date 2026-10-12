import { describe, expect, it } from "vitest"
import { csvCell } from "./csv"

describe("csvCell", () => {
  it("quotes per RFC-4180", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""')
    expect(csvCell("plain")).toBe("plain")
    expect(csvCell(null)).toBe("")
    expect(csvCell(new Date("2026-01-02T03:04:05.000Z"))).toBe("2026-01-02T03:04:05.000Z")
  })

  it.each(["=SUM(1,1)", "+1", "-1", "@cmd", "\tx", "\rx"])(
    "neutralises formula prefix %j",
    (raw) => {
      expect(csvCell(raw).replace(/^"/, "").startsWith("'")).toBe(true)
    },
  )

  it("neutralises a quoted HYPERLINK payload", () => {
    expect(csvCell('=HYPERLINK("http://evil.example","open")')).toBe(
      '"\'=HYPERLINK(""http://evil.example"",""open"")"',
    )
  })
})
