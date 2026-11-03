import { describe, expect, it } from "vitest"
import { payDay, payPaidDay, payRange, splitMoney } from "./format"

describe("payDay", () => {
  it("writes the month out and does not shift the day", () => {
    expect(payDay("2026-11-17")).toBe("November 17, 2026")
    expect(payDay("2027-01-01")).toBe("January 1, 2027")
  })

  it("hands back something unparseable as it came", () => {
    expect(payDay("soon")).toBe("soon")
  })
})

describe("payRange", () => {
  it("collapses a range inside one month", () => {
    expect(payRange("2027-07-10", "2027-07-19")).toBe("July 10–19, 2027")
  })

  it("names both months when the journey crosses one", () => {
    expect(payRange("2027-06-28", "2027-07-07")).toBe("June 28 – July 7, 2027")
  })

  it("writes both dates in full across a year end", () => {
    expect(payRange("2027-12-28", "2028-01-06")).toBe("December 28, 2027 – January 6, 2028")
  })

  it("shows a one-day range as a single date", () => {
    expect(payRange("2027-07-10", "2027-07-10")).toBe("July 10, 2027")
  })
})

describe("payPaidDay", () => {
  it("uses the Pacific calendar day", () => {
    // 03:30 UTC on Nov 4 is still the evening of Nov 3 in Pacific time.
    expect(payPaidDay(new Date("2026-11-04T03:30:00Z"))).toBe("November 3, 2026")
    expect(payPaidDay(new Date("2026-11-04T17:00:00Z"))).toBe("November 4, 2026")
  })
})

describe("splitMoney", () => {
  it("splits off the cents", () => {
    expect(splitMoney("$1,000.00")).toEqual({ whole: "$1,000", cents: ".00" })
    expect(splitMoney("€980.50")).toEqual({ whole: "€980", cents: ".50" })
    expect(splitMoney("GTQ 1,200.00")).toEqual({ whole: "GTQ 1,200", cents: ".00" })
  })

  it("leaves an amount without decimals whole", () => {
    expect(splitMoney("¥1,000")).toEqual({ whole: "¥1,000", cents: "" })
    expect(splitMoney("—")).toEqual({ whole: "—", cents: "" })
  })
})
