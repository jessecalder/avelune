import { describe, expect, it } from "vitest"
import { cents, currency, date, dbMessage, int, pacificDateTime, text } from "./forms"

const fd = (entries: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.set(k, v)
  return f
}

describe("admin form readers", () => {
  it("treats blank as null and trims", () => {
    expect(text(fd({ a: "  " }), "a")).toBeNull()
    expect(text(fd({ a: " x " }), "a")).toBe("x")
    expect(text(fd({}), "a")).toBeNull()
  })
  it("reads money as integer cents", () => {
    expect(cents(fd({ m: "1,250" }), "m")).toBe(125000)
    expect(cents(fd({ m: "$1250.5" }), "m")).toBe(125050)
    expect(cents(fd({ m: "0.07" }), "m")).toBe(7)
    expect(cents(fd({ m: "" }), "m")).toBeNull()
    expect(cents(fd({ m: "12.345" }), "m")).toBeUndefined()
    expect(cents(fd({ m: "abc" }), "m")).toBeUndefined()
  })
  it("reads whole numbers, dates and currencies", () => {
    expect(int(fd({ n: "8" }), "n")).toBe(8)
    expect(int(fd({ n: "8.5" }), "n")).toBeUndefined()
    expect(date(fd({ d: "2027-07-10" }), "d")).toBe("2027-07-10")
    expect(date(fd({ d: "07/10/2027" }), "d")).toBeUndefined()
    expect(currency(fd({ c: "EUR" }), "c")).toBe("eur")
    expect(currency(fd({ c: "euro" }), "c")).toBeUndefined()
  })
  it("reads datetime-local as Pacific time, across daylight saving", () => {
    expect(pacificDateTime(fd({ t: "2027-07-10T09:30" }), "t")?.toISOString()).toBe("2027-07-10T16:30:00.000Z")
    expect(pacificDateTime(fd({ t: "2027-01-10T09:30" }), "t")?.toISOString()).toBe("2027-01-10T17:30:00.000Z")
    expect(pacificDateTime(fd({ t: "nope" }), "t")).toBeUndefined()
  })
  it("maps database refusals to sentences", () => {
    expect(dbMessage({ code: "23503" })).toMatch(/still point at this one/)
    expect(dbMessage({ cause: { code: "23505", constraint_name: "families_email_key_idx" } }, { families_email_key_idx: "A family with that email already exists." })).toBe(
      "A family with that email already exists.",
    )
    expect(dbMessage({ code: "P0001", message: "traveller x does not belong" })).toBe("traveller x does not belong")
  })
})
