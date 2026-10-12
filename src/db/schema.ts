import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

export const signupStatus = pgEnum("signup_status", [
  "pending",
  "confirmed",
  "unsubscribed",
])

export const signups = pgTable(
  "signups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** As typed, trimmed. */
    email: text("email").notNull(),
    /** Lowercased + trimmed; the dedupe key. */
    emailKey: text("email_key").notNull(),
    name: text("name"),
    childrenCount: integer("children_count"),
    childrenAges: text("children_ages"),
    destinations: text("destinations").array(),
    notes: text("notes"),
    source: text("source"),
    referrer: text("referrer"),
    utm: jsonb("utm").$type<Record<string, string>>(),
    landingPath: text("landing_path"),
    status: signupStatus("status").notNull().default("pending"),
    /** Capability token: returned once to the signing-up browser to unlock enrichment. */
    confirmToken: text("confirm_token").notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    consentVersion: text("consent_version").notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("signups_email_key_idx").on(t.emailKey),
    uniqueIndex("signups_confirm_token_idx").on(t.confirmToken),
  ],
)

export type Signup = typeof signups.$inferSelect
export type NewSignup = typeof signups.$inferInsert
