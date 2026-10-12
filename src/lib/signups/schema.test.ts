import { describe, expect, it } from "vitest"
import {
  enrichSchema,
  isDisposableEmail,
  joinSchema,
  normalizeEmail,
} from "./schema"

const TOKEN = "a".repeat(48)

describe("normalizeEmail", () => {
  it("keeps the trimmed original and lowercases the key", () => {
    expect(normalizeEmail("  Jane.Doe@Example.COM ")).toEqual({
      email: "Jane.Doe@Example.COM",
      emailKey: "jane.doe@example.com",
    })
  })
})

describe("joinSchema", () => {
  it("accepts a minimal payload and trims the email", () => {
    const r = joinSchema.safeParse({ email: "  a@b.co  " })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe("a@b.co")
  })

  it("rejects bad or missing emails with the friendly message", () => {
    for (const email of ["nope", "", undefined, "a@b.co" + "x".repeat(260)]) {
      const r = joinSchema.safeParse({ email })
      expect(r.success).toBe(false)
      if (!r.success) {
        expect(r.error.issues[0].message).toBe("Enter a valid email address.")
      }
    }
  })

  it("turns an empty name into undefined and rejects overlong names", () => {
    const blank = joinSchema.parse({ email: "a@b.co", name: "   " })
    expect(blank.name).toBeUndefined()
    expect(joinSchema.parse({ email: "a@b.co", name: "" }).name).toBeUndefined()
    expect(joinSchema.safeParse({ email: "a@b.co", name: "x".repeat(81) }).success).toBe(false)
  })

  it("accepts source; an invalid one is dropped (see below)", () => {
    expect(joinSchema.safeParse({ email: "a@b.co", source: "hero" }).success).toBe(true)
    expect(joinSchema.safeParse({ email: "a@b.co", source: "Hero1" }).success).toBe(true)
  })

  it("keeps only utm_ keys with short string values", () => {
    const utm = JSON.stringify({
      utm_source: "ig",
      utm_campaign: "x".repeat(201),
      fbclid: "abc",
      utm_medium: 5,
      utm_term: "summer",
    })
    const r = joinSchema.parse({ email: "a@b.co", utm })
    expect(r.utm).toEqual({ utm_source: "ig", utm_term: "summer" })
  })

  it("drops invalid or non-object utm JSON", () => {
    expect(joinSchema.parse({ email: "a@b.co", utm: "{oops" }).utm).toBeUndefined()
    expect(joinSchema.parse({ email: "a@b.co", utm: "[1]" }).utm).toBeUndefined()
    expect(joinSchema.parse({ email: "a@b.co", utm: "{}" }).utm).toBeUndefined()
  })

  it("accepts an oversized referrer (truncated, see below)", () => {
    expect(joinSchema.safeParse({ email: "a@b.co", referrer: "x".repeat(501) }).success).toBe(true)
  })
})

describe("isDisposableEmail", () => {
  it("flags throwaway domains and passes real ones", () => {
    expect(isDisposableEmail("x@mailinator.com")).toBe(true)
    expect(isDisposableEmail("x@maildrop.cc")).toBe(true)
    expect(isDisposableEmail("x@gmail.com")).toBe(false)
    expect(isDisposableEmail("x@notmailinator.com")).toBe(false)
  })
})

describe("enrichSchema", () => {
  it("requires a 48-char hex token", () => {
    expect(enrichSchema.safeParse({ token: TOKEN }).success).toBe(true)
    expect(enrichSchema.safeParse({ token: "short" }).success).toBe(false)
    expect(enrichSchema.safeParse({ token: "Z".repeat(48) }).success).toBe(false)
  })

  it("coerces childrenCount and bounds it to 0..12", () => {
    expect(enrichSchema.parse({ token: TOKEN, childrenCount: "3" }).childrenCount).toBe(3)
    expect(enrichSchema.parse({ token: TOKEN, childrenCount: "0" }).childrenCount).toBe(0)
    expect(enrichSchema.parse({ token: TOKEN, childrenCount: "" }).childrenCount).toBeUndefined()
    expect(enrichSchema.safeParse({ token: TOKEN, childrenCount: "13" }).success).toBe(false)
    expect(enrichSchema.safeParse({ token: TOKEN, childrenCount: "-1" }).success).toBe(false)
    expect(enrichSchema.safeParse({ token: TOKEN, childrenCount: "1.5" }).success).toBe(false)
  })

  it("dedupes destinations and rejects unknown values", () => {
    const r = enrichSchema.parse({
      token: TOKEN,
      destinations: ["antigua", "san-sebastian", "antigua"],
    })
    expect(r.destinations).toEqual(["antigua", "san-sebastian"])
    expect(enrichSchema.safeParse({ token: TOKEN, destinations: ["mars"] }).success).toBe(false)
  })

  it("trims and bounds free text", () => {
    expect(enrichSchema.parse({ token: TOKEN, notes: "  hi  " }).notes).toBe("hi")
    expect(enrichSchema.parse({ token: TOKEN, notes: "   " }).notes).toBeUndefined()
    expect(enrichSchema.safeParse({ token: TOKEN, notes: "x".repeat(501) }).success).toBe(false)
    expect(enrichSchema.safeParse({ token: TOKEN, childrenAges: "x".repeat(121) }).success).toBe(false)
  })
})

describe("joinSchema telemetry tolerance", () => {
  it("truncates a long referrer instead of rejecting", () => {
    const r = joinSchema.safeParse({ email: "a@b.co", referrer: "https://g.co/?" + "q".repeat(600) })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.referrer?.length).toBe(500)
  })
  it("drops an invalid source instead of rejecting", () => {
    const r = joinSchema.safeParse({ email: "a@b.co", source: "Bad Value!" })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.source).toBeUndefined()
  })
})
