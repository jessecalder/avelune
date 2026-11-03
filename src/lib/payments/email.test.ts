import { describe, expect, it } from "vitest"
import { paymentEmailDraft, paymentEmailHtml, type PaymentEmailInput } from "./email"

const URL = "https://avelunefamily.com/pay/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-AbCde"

const input = (over: Partial<PaymentEmailInput> = {}): PaymentEmailInput => ({
  familyName: "Calder",
  primaryContactName: "Maya Calder",
  departureName: "San Sebastián, July 2027",
  startsOn: "2027-07-10",
  endsOn: "2027-07-19",
  bookingRef: "AV-0007",
  kind: "deposit",
  label: null,
  amountCents: 100000,
  currency: "usd",
  dueOn: "2026-11-17",
  url: URL,
  ...over,
})

describe("paymentEmailDraft", () => {
  it("reads like a short note from a person", () => {
    const { subject, text } = paymentEmailDraft(input())
    expect(subject).toBe("Your deposit for San Sebastián, July 2027")
    expect(text).toBe(
      [
        "Dear Maya,",
        "Here is the private payment link for your family's deposit for San Sebastián, July 2027 (July 10 to 19, 2027), booking AV-0007.",
        "Amount: $1,000.00\nDue by: November 17, 2026",
        URL,
        "The link opens a short page with the details; the payment itself is handled by Stripe. It is private to your family, so please don't forward it.",
        "If anything is unclear, just reply. It comes straight to me.",
        "Jesse\nAvelune",
      ].join("\n\n"),
    )
  })

  it("puts the link alone on its own line so it becomes the button", () => {
    const { text } = paymentEmailDraft(input())
    expect(text.split("\n\n")).toContain(URL)
  })

  it("names each kind of payment in the subject and the first sentence", () => {
    const subjects = (over: Partial<PaymentEmailInput>) => paymentEmailDraft(input(over)).subject
    expect(subjects({ kind: "deposit" })).toBe("Your deposit for San Sebastián, July 2027")
    expect(subjects({ kind: "balance" })).toBe("Your remaining balance for San Sebastián, July 2027")
    expect(subjects({ kind: "instalment" })).toBe("Your instalment for San Sebastián, July 2027")
    expect(subjects({ kind: "extra", label: "airport transfer" })).toBe("Your airport transfer for San Sebastián, July 2027")
    expect(subjects({ kind: "extra", label: null })).toBe("Your payment for San Sebastián, July 2027")
    expect(paymentEmailDraft(input({ kind: "balance" })).text).toContain("your family's remaining balance for")
  })

  it("keeps the subject on one line", () => {
    const { subject } = paymentEmailDraft(input({ kind: "extra", label: "airport\ntransfer", departureName: "Antigua,\r\nAugust 2027" }))
    expect(subject).toBe("Your airport transfer for Antigua, August 2027")
  })

  it("greets by first name only when it is a plain name", () => {
    const greet = (name: string | null) => paymentEmailDraft(input({ primaryContactName: name })).text.split("\n")[0]
    expect(greet("Maya Calder")).toBe("Dear Maya,")
    expect(greet("  Maya & Dan Calder")).toBe("Dear Maya,")
    expect(greet("Zoë")).toBe("Dear Zoë,")
    expect(greet("Mary-Ann Okafor")).toBe("Dear Mary-Ann,")
    expect(greet("O’Brien")).toBe("Dear O’Brien,")
    expect(greet(null)).toBe("Hello,")
    expect(greet("")).toBe("Hello,")
    expect(greet("Dr. Maya Calder")).toBe("Hello,")
    expect(greet("<script>alert(1)</script>")).toBe("Hello,")
    expect(greet("Maya1")).toBe("Hello,")
  })

  it("writes the dates as a person would", () => {
    const range = (startsOn: string, endsOn: string) => paymentEmailDraft(input({ startsOn, endsOn })).text
    expect(range("2027-07-10", "2027-07-19")).toContain("(July 10 to 19, 2027)")
    expect(range("2027-07-28", "2027-08-06")).toContain("(July 28 to August 6, 2027)")
    expect(range("2026-12-28", "2027-01-06")).toContain("(December 28, 2026 to January 6, 2027)")
    expect(range("2027-07-10", "2027-07-10")).toContain("(July 10, 2027)")
  })

  it("formats the amount in the payment's currency", () => {
    expect(paymentEmailDraft(input({ amountCents: 250050, currency: "eur" })).text).toContain("Amount: €2,500.50")
  })

  it("leaves out the children, the family's email and any note", () => {
    const { text, subject } = paymentEmailDraft(input())
    expect(text + subject).not.toMatch(/@|child|traveller|note/i)
    // Nothing from the family but the first name in the greeting.
    expect(text + subject).not.toContain("Calder")
  })
})

describe("paymentEmailHtml", () => {
  const draft = () => paymentEmailDraft(input()).text

  it("wraps the message in the Maison register", () => {
    const html = paymentEmailHtml(draft(), URL)
    expect(html).toContain("<!doctype html>")
    expect(html).toContain("AVELUNE")
    expect(html).toContain("#F4F1EA")
    expect(html).toContain("#1A1A1A")
    expect(html).toContain("#6E6A63")
    expect(html).not.toMatch(/border-radius|box-shadow/)
  })

  it("turns a paragraph that is only the link into a square button, with the address underneath", () => {
    const html = paymentEmailHtml(draft(), URL)
    expect(html.match(/Pay securely/g)).toHaveLength(1)
    expect(html).toContain(`<a href="${URL}"`)
    expect(html).toMatch(new RegExp(`color:#6E6A63;word-break:break-all;">${URL}</p>`))
  })

  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    const html = paymentEmailHtml("One\nTwo\n\nThree", URL)
    expect(html).toContain(">One<br>Two</p>")
    expect(html).toContain(">Three</p>")
    expect(html.match(/<p /g)).toHaveLength(2)
  })

  it("reads a typed message that arrives with Windows line endings", () => {
    const html = paymentEmailHtml("One\r\nTwo\r\n\r\nThree", URL)
    expect(html).toContain(">One<br>Two</p>")
    expect(html).toContain(">Three</p>")
    expect(html).not.toContain("\r")
  })

  it("escapes everything the owner typed", () => {
    const html = paymentEmailHtml(`Dear <b>Maya</b> & "friends" it's\n\n<script>alert(1)</script>\n\n${URL}`, URL)
    expect(html).toContain("Dear &lt;b&gt;Maya&lt;/b&gt; &amp; &quot;friends&quot; it&#39;s")
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
    expect(html).not.toContain("<script")
    expect(html).not.toContain("<b>")
  })

  it("escapes a hostile address and refuses a non-web one", () => {
    const evil = 'https://x.test/"onmouseover="alert(1)'
    const html = paymentEmailHtml(evil, evil)
    expect(html).not.toContain("<a href")
    expect(html).not.toContain("Pay securely")
    expect(html).toContain("&quot;onmouseover=&quot;")
    const js = paymentEmailHtml("javascript:alert(1)", "javascript:alert(1)")
    expect(js).not.toContain("<a href")
    expect(js).not.toContain("Pay securely")
  })

  it("links the address when it sits inside a longer paragraph, without a button", () => {
    const html = paymentEmailHtml(`Pay here: ${URL} when you can.`, URL)
    expect(html).toContain(`<a href="${URL}"`)
    expect(html).not.toContain("Pay securely")
    expect(html).toContain("when you can.")
  })

  it("has no button when the message has no link", () => {
    expect(paymentEmailHtml("Just a note.", URL)).not.toContain("Pay securely")
  })

  it("renders the whole draft: greeting, details, button, sign-off", () => {
    const html = paymentEmailHtml(draft(), URL)
    expect(html).toContain("Dear Maya,")
    expect(html).toContain("Amount: $1,000.00<br>Due by: November 17, 2026")
    expect(html).toContain("San Sebastián, July 2027")
    expect(html).toContain("Jesse<br>Avelune")
    expect(html.indexOf("Amount:")).toBeLessThan(html.indexOf("Pay securely"))
    expect(html.indexOf("Pay securely")).toBeLessThan(html.indexOf("Jesse<br>Avelune"))
  })
})
