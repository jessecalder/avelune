import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { getTableConfig } from "drizzle-orm/pg-core"
import { describe, expect, it } from "vitest"
import * as schema from "./schema"

const root = join(__dirname, "..", "..")
// Every migration, so a comment added later in a new migration still counts.
const commentsSql = readdirSync(join(root, "drizzle"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join(root, "drizzle", name), "utf8"))
  .join("\n")
const dictionary = readFileSync(join(root, "docs", "data-model.md"), "utf8")

const operatingTables = {
  departures: schema.departures,
  families: schema.families,
  travellers: schema.travellers,
  bookings: schema.bookings,
  booking_travellers: schema.bookingTravellers,
  payments: schema.payments,
  payment_links: schema.paymentLinks,
  vendors: schema.vendors,
  vendor_contacts: schema.vendorContacts,
  departure_services: schema.departureServices,
  documents: schema.documents,
  interactions: schema.interactions,
}
const appTables = {
  signups: schema.signups,
  reservations: schema.reservations,
  stripe_events: schema.stripeEvents,
}

describe("operating model schema", () => {
  it("exports the twelve operating-model tables under their SQL names", () => {
    for (const [name, table] of Object.entries(operatingTables)) {
      expect(getTableConfig(table).name).toBe(name)
    }
  })

  it("gives every operating-model table created_at and updated_at", () => {
    for (const [name, table] of Object.entries(operatingTables)) {
      const cols = getTableConfig(table).columns.map((c) => c.name)
      expect(cols, name).toContain("created_at")
      expect(cols, name).toContain("updated_at")
    }
  })

  it("gives every foreign key an explicit ON DELETE rule", () => {
    for (const [name, table] of Object.entries(operatingTables)) {
      for (const fk of getTableConfig(table).foreignKeys) {
        expect(fk.onDelete, name).toBeDefined()
      }
    }
  })

  it("keeps the expected enum values", () => {
    expect(schema.ageBand.enumValues).toEqual([
      "under_3",
      "age_3_5",
      "age_6_9",
      "age_10_13",
      "age_14_17",
      "adult",
    ])
    expect(schema.bookingStatus.enumValues).toEqual([
      "waitlisted",
      "held",
      "confirmed",
      "cancelled",
      "completed",
    ])
    expect(schema.paymentStatus.enumValues).toEqual([
      "scheduled",
      "invoiced",
      "paid",
      "refunded",
      "waived",
      "cancelled",
    ])
    expect(schema.vendorCategory.enumValues).toEqual([
      "accommodation",
      "host",
      "guide",
      "transport",
      "restaurant",
      "activity",
      "other",
    ])
    expect(schema.familyStatus.enumValues).toContain("in_conversation")
    expect(schema.journey.enumValues).toEqual(["san-sebastian", "antigua"])
  })

  it("leaves the existing tables as they were", () => {
    expect(schema.signupStatus.enumValues).toEqual([
      "pending",
      "confirmed",
      "unsubscribed",
    ])
    expect(getTableConfig(schema.reservations).columns).toHaveLength(16)
    expect(getTableConfig(schema.signups).columns).toHaveLength(21)
  })

  it("confines the sensitive child columns to travellers", () => {
    const sensitive = [
      "date_of_birth",
      "dietary",
      "allergies",
      "medical_notes",
    ]
    for (const [name, table] of Object.entries({
      ...operatingTables,
      ...appTables,
    })) {
      if (name === "travellers") continue
      const cols = getTableConfig(table).columns.map((c) => c.name)
      for (const s of sensitive) expect(cols, name).not.toContain(s)
    }
  })
})

describe("column comments and data dictionary", () => {
  it("has a COMMENT ON for every table and column", () => {
    for (const [name, table] of Object.entries({
      ...operatingTables,
      ...appTables,
    })) {
      expect(commentsSql, name).toContain(`COMMENT ON TABLE "${name}" IS`)
      for (const col of getTableConfig(table).columns) {
        expect(
          commentsSql,
          `${name}.${col.name}`,
        ).toContain(`COMMENT ON COLUMN "${name}"."${col.name}" IS`)
      }
    }
  })

  it("lists every column in docs/data-model.md", () => {
    for (const [name, table] of Object.entries({
      ...operatingTables,
      ...appTables,
    })) {
      const start = dictionary.indexOf(`### \`${name}\``)
      expect(start, `${name} section`).toBeGreaterThan(-1)
      const next = dictionary.indexOf("\n## ", start)
      const nextTable = dictionary.indexOf("\n### ", start + 5)
      const end = Math.min(
        ...[next, nextTable].filter((i) => i > -1),
        dictionary.length,
      )
      const section = dictionary.slice(start, end)
      for (const col of getTableConfig(table).columns) {
        expect(section, `${name}.${col.name}`).toContain(`| \`${col.name}\` |`)
      }
    }
  })
})
