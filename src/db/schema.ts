import {
  index,
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

export const journey = pgEnum("journey", ["san-sebastian", "antigua"])

export const reservationStatus = pgEnum("reservation_status", [
  "pending",
  "paid",
  "refunded",
  "expired",
  "cancelled",
])

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signupId: uuid("signup_id").references(() => signups.id, {
      onDelete: "set null",
    }),
    email: text("email").notNull(),
    emailKey: text("email_key").notNull(),
    journey: journey("journey").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: reservationStatus("status").notNull().default("pending"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeCustomerId: text("stripe_customer_id"),
    holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("reservations_checkout_session_idx").on(
      t.stripeCheckoutSessionId,
    ),
    index("reservations_email_key_idx").on(t.emailKey),
  ],
)

/** Stripe event ids already handled; the webhook's idempotency gate. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Reservation = typeof reservations.$inferSelect
export type NewReservation = typeof reservations.$inferInsert
