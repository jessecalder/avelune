import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgSequence,
  pgTable,
  smallint,
  text,
  time,
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

/* ==========================================================================
 * Operating model (migration 0002 "operating_model")
 *
 * Eleven tables that run the business behind the signup list: departures,
 * families, travellers, bookings, payments, vendors, services, documents and
 * a contact log. Column comments (COMMENT ON, read by NocoDB / psql \d+) are
 * in the custom migration "table_comments"; the full data dictionary is
 * docs/data-model.md. Conventions: snake_case, uuid keys, money in integer
 * minor units, lowercase ISO 4217 currency (text + CHECK, like reservations),
 * every table has created_at / updated_at (updated_at is kept current by a
 * database trigger so spreadsheet edits count too), explicit ON DELETE rules:
 * money / contract / supplier history = RESTRICT, pure children = CASCADE,
 * references into the app-owned tables above = SET NULL.
 * ======================================================================== */

export const familyStatus = pgEnum("family_status", [
  "lead",
  "in_conversation",
  "booked",
  "travelled",
  "inactive",
])

/** Product tiers plus adult. Snake_case so it is easy to type in a filter. */
export const ageBand = pgEnum("age_band", [
  "under_3",
  "age_3_5",
  "age_6_9",
  "age_10_13",
  "age_14_17",
  "adult",
])

export const departureStatus = pgEnum("departure_status", [
  "planning",
  "open",
  "closed",
  "completed",
  "cancelled",
])

export const bookingStatus = pgEnum("booking_status", [
  "waitlisted",
  "held",
  "confirmed",
  "cancelled",
  "completed",
])

export const paymentKind = pgEnum("payment_kind", [
  "deposit",
  "instalment",
  "balance",
  "extra",
])

export const paymentStatus = pgEnum("payment_status", [
  "scheduled",
  "invoiced",
  "paid",
  "refunded",
  "waived",
  "cancelled",
])

export const paymentMethod = pgEnum("payment_method", [
  "stripe",
  "bank_transfer",
  "check",
  "other",
])

export const vendorCategory = pgEnum("vendor_category", [
  "accommodation",
  "host",
  "guide",
  "transport",
  "restaurant",
  "activity",
  "other",
])

export const vendorStatus = pgEnum("vendor_status", [
  "prospect",
  "contacted",
  "approved",
  "contracted",
  "declined",
  "inactive",
])

export const serviceStatus = pgEnum("service_status", [
  "needed",
  "requested",
  "quoted",
  "held",
  "confirmed",
  "declined",
  "cancelled",
])

export const rateUnit = pgEnum("rate_unit", [
  "flat",
  "per_person",
  "per_family",
  "per_night",
  "per_room_night",
  "per_hour",
  "per_day",
])

export const documentKind = pgEnum("document_kind", [
  "contract",
  "quote",
  "invoice",
  "insurance",
  "licence",
  "background_check",
  "waiver",
  "terms",
  "other",
])

export const documentStatus = pgEnum("document_status", [
  "requested",
  "draft",
  "sent",
  "on_file",
  "void",
])

export const interactionKind = pgEnum("interaction_kind", [
  "email",
  "call",
  "video",
  "meeting",
  "message",
  "note",
])

/** Human booking references: 'AV-0001', 'AV-0002', ... (see bookings.ref). */
export const bookingRefSeq = pgSequence("booking_ref_seq")

/** created_at / updated_at for every operating-model table. */
const auditColumns = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/**
 * One dated run of a journey (e.g. San Sebastián, 10-19 July 2027). Reuses the
 * journey enum instead of a trips table. No customer personal data.
 */
export const departures = pgTable(
  "departures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Short human code, e.g. 'SSB-2027-07'. */
    code: text("code").notNull(),
    journey: journey("journey").notNull(),
    name: text("name").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    status: departureStatus("status").notNull().default("planning"),
    minFamilies: smallint("min_families").notNull().default(6),
    maxFamilies: smallint("max_families").notNull().default(10),
    /** When Jesse declared that it will run. NULL = not yet guaranteed. */
    guaranteedAt: timestamp("guaranteed_at", { withTimezone: true }),
    currency: text("currency").notNull().default("usd"),
    balanceDueOn: date("balance_due_on"),
    priceNote: text("price_note"),
    notes: text("notes"),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("departures_code_idx").on(t.code),
    uniqueIndex("departures_journey_starts_on_idx").on(t.journey, t.startsOn),
    check("departures_dates_check", sql`ends_on > starts_on`),
    check(
      "departures_capacity_check",
      sql`min_families >= 1 AND max_families >= min_families`,
    ),
    check("departures_currency_check", sql`currency ~ '^[a-z]{3}$'`),
  ],
)

/**
 * The customer household. Usually promoted by hand from a signup; the signup
 * stays the marketing-consent record. Primary contact lives here.
 */
export const families = pgTable(
  "families",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signupId: uuid("signup_id").references(() => signups.id, {
      onDelete: "set null",
    }),
    familyName: text("family_name").notNull(),
    primaryContactName: text("primary_contact_name"),
    /** As typed, trimmed. */
    email: text("email").notNull(),
    /** Generated by the database (lower + trim); same rule as signups.email_key. */
    emailKey: text("email_key")
      .notNull()
      .generatedAlwaysAs(sql`lower(btrim(email))`),
    /** BOOKING STAGE: collect only after the privacy page is updated. */
    phone: text("phone"),
    /** BOOKING STAGE: collect only after the privacy page is updated. */
    homeCity: text("home_city"),
    countryCode: text("country_code").notNull().default("US"),
    status: familyStatus("status").notNull().default("lead"),
    source: text("source"),
    stripeCustomerId: text("stripe_customer_id"),
    notes: text("notes"),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("families_email_key_idx").on(t.emailKey),
    uniqueIndex("families_signup_id_idx").on(t.signupId),
    uniqueIndex("families_stripe_customer_id_idx").on(t.stripeCustomerId),
    index("families_status_idx").on(t.status),
    check("families_country_code_check", sql`country_code ~ '^[A-Z]{2}$'`),
  ],
)

/**
 * Every person in a family. The ONLY table allowed to hold children's personal
 * data. The sensitive columns (a child's names, anyone's date of birth,
 * dietary, allergies, medical notes) stay NULL until a booking-stage consent
 * version is recorded on the row (travellers_sensitive_gate_check), which must
 * not happen before the privacy page is updated. Passports / government IDs
 * are never stored.
 */
export const travellers = pgTable(
  "travellers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    ageBand: ageBand("age_band").notNull(),
    /** Non-identifying display label, e.g. 'Child A (6-9)'. */
    label: text("label").notNull(),
    relationship: text("relationship"),
    /** Adults: allowed. CHILDREN: SENSITIVE (gated). */
    firstName: text("first_name"),
    /** Adults: booking-stage data. CHILDREN: SENSITIVE (gated). */
    lastName: text("last_name"),
    /** Adults only (CHECK). */
    email: text("email"),
    /** Adults only (CHECK). */
    phone: text("phone"),
    /** SENSITIVE, any age (gated). */
    dateOfBirth: date("date_of_birth"),
    /** SENSITIVE (gated). */
    dietary: text("dietary"),
    /** SENSITIVE: health (gated). */
    allergies: text("allergies"),
    /** SENSITIVE: health (gated). */
    medicalNotes: text("medical_notes"),
    /** Set only by the booking form from the published notice version. */
    sensitiveConsentVersion: text("sensitive_consent_version"),
    sensitiveConsentAt: timestamp("sensitive_consent_at", {
      withTimezone: true,
    }),
    /** Departure ends_on + 90 days; a scheduled job NULLs the sensitive fields. */
    sensitivePurgeAfter: date("sensitive_purge_after"),
    ...auditColumns(),
  },
  (t) => [
    index("travellers_family_id_idx").on(t.familyId),
    index("travellers_purge_idx")
      .on(t.sensitivePurgeAfter)
      .where(sql`sensitive_purge_after IS NOT NULL`),
    check(
      "travellers_child_contact_check",
      sql`age_band = 'adult' OR (email IS NULL AND phone IS NULL)`,
    ),
    check(
      "travellers_sensitive_gate_check",
      sql`(sensitive_consent_version IS NOT NULL AND sensitive_consent_at IS NOT NULL AND sensitive_purge_after IS NOT NULL) OR (date_of_birth IS NULL AND dietary IS NULL AND allergies IS NULL AND medical_notes IS NULL AND (age_band = 'adult' OR (first_name IS NULL AND last_name IS NULL)))`,
    ),
  ],
)

/**
 * A family's place on a departure, from waitlist / held deposit to completed
 * trip. Money owed and paid lives in payments; party size comes from
 * booking_travellers.
 */
export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Human reference, e.g. 'AV-0007'; filled from booking_ref_seq. */
    ref: text("ref")
      .notNull()
      .default(sql`('AV-' || lpad(nextval('booking_ref_seq')::text, 4, '0'))`),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "restrict" }),
    departureId: uuid("departure_id")
      .notNull()
      .references(() => departures.id, { onDelete: "restrict" }),
    status: bookingStatus("status").notNull().default("held"),
    totalPriceCents: integer("total_price_cents"),
    currency: text("currency").notNull().default("usd"),
    heldUntil: timestamp("held_until", { withTimezone: true }),
    termsVersion: text("terms_version"),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    privacyVersion: text("privacy_version"),
    privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    /** BOOKING STAGE: planned arrival, for transfers. */
    arrivesAt: timestamp("arrives_at", { withTimezone: true }),
    /** BOOKING STAGE. */
    arrivalDetails: text("arrival_details"),
    /** BOOKING STAGE: planned departure from the destination. */
    departsAt: timestamp("departs_at", { withTimezone: true }),
    /** BOOKING STAGE. */
    departureDetails: text("departure_details"),
    notes: text("notes"),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("bookings_ref_idx").on(t.ref),
    uniqueIndex("bookings_active_family_departure_idx")
      .on(t.familyId, t.departureId)
      .where(sql`status <> 'cancelled'`),
    index("bookings_departure_status_idx").on(t.departureId, t.status),
    index("bookings_family_id_idx").on(t.familyId),
    check(
      "bookings_price_check",
      sql`total_price_cents IS NULL OR total_price_cents >= 0`,
    ),
    check("bookings_currency_check", sql`currency ~ '^[a-z]{3}$'`),
  ],
)

/**
 * Which family members go on a booking, and the age tier each joins on that
 * departure. A trigger (custom migration) requires the traveller to belong to
 * the booking's family.
 */
export const bookingTravellers = pgTable(
  "booking_travellers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    travellerId: uuid("traveller_id")
      .notNull()
      .references(() => travellers.id, { onDelete: "restrict" }),
    ageBand: ageBand("age_band").notNull(),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex("booking_travellers_booking_traveller_idx").on(
      t.bookingId,
      t.travellerId,
    ),
    index("booking_travellers_traveller_id_idx").on(t.travellerId),
  ],
)

/**
 * The payment schedule and record for a booking. Refunds are tracked on the
 * row they reverse. The deposit row links to the reservations row that took it.
 * Amounts and Stripe ids only; card data is never stored.
 */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    kind: paymentKind("kind").notNull(),
    label: text("label"),
    status: paymentStatus("status").notNull().default("scheduled"),
    method: paymentMethod("method").notNull().default("stripe"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    dueOn: date("due_on").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    amountRefundedCents: integer("amount_refunded_cents").notNull().default(0),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    reservationId: uuid("reservation_id").references(() => reservations.id, {
      onDelete: "set null",
    }),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeInvoiceId: text("stripe_invoice_id"),
    notes: text("notes"),
    ...auditColumns(),
  },
  (t) => [
    index("payments_booking_id_idx").on(t.bookingId),
    index("payments_status_due_on_idx").on(t.status, t.dueOn),
    uniqueIndex("payments_reservation_id_idx").on(t.reservationId),
    uniqueIndex("payments_stripe_payment_intent_idx").on(
      t.stripePaymentIntentId,
    ),
    uniqueIndex("payments_stripe_invoice_idx").on(t.stripeInvoiceId),
    check(
      "payments_amounts_check",
      sql`amount_cents > 0 AND amount_refunded_cents BETWEEN 0 AND amount_cents`,
    ),
    check(
      "payments_paid_at_check",
      sql`status NOT IN ('paid', 'refunded') OR paid_at IS NOT NULL`,
    ),
    check(
      "payments_refunded_check",
      sql`status <> 'refunded' OR amount_refunded_cents = amount_cents`,
    ),
    check(
      "payments_reservation_kind_check",
      sql`reservation_id IS NULL OR kind = 'deposit'`,
    ),
    check("payments_currency_check", sql`currency ~ '^[a-z]{3}$'`),
  ],
)

/**
 * Every supplier: houses and hotels, age-tier hosts, guides, transfers,
 * restaurants, activity operators. Individuals (is_individual) are personal
 * data with their own retention.
 */
export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: vendorCategory("category").notNull(),
    isIndividual: boolean("is_individual").notNull().default(false),
    status: vendorStatus("status").notNull().default("prospect"),
    /** Destination served; NULL = not tied to one destination. */
    journey: journey("journey"),
    city: text("city"),
    countryCode: text("country_code"),
    website: text("website"),
    email: text("email"),
    phone: text("phone"),
    defaultCurrency: text("default_currency"),
    paymentTerms: text("payment_terms"),
    rating: smallint("rating"),
    notes: text("notes"),
    ...auditColumns(),
  },
  (t) => [
    index("vendors_category_journey_idx").on(t.category, t.journey),
    index("vendors_status_idx").on(t.status),
    index("vendors_name_idx").on(t.name),
    check("vendors_rating_check", sql`rating IS NULL OR rating BETWEEN 1 AND 5`),
    check(
      "vendors_country_code_check",
      sql`country_code IS NULL OR country_code ~ '^[A-Z]{2}$'`,
    ),
    check(
      "vendors_currency_check",
      sql`default_currency IS NULL OR default_currency ~ '^[a-z]{3}$'`,
    ),
  ],
)

/** People at a vendor: owner, reservations desk, on-the-day driver. */
export const vendorContacts = pgTable(
  "vendor_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    email: text("email"),
    phone: text("phone"),
    prefersWhatsapp: boolean("prefers_whatsapp").notNull().default(false),
    language: text("language"),
    isPrimary: boolean("is_primary").notNull().default(false),
    notes: text("notes"),
    ...auditColumns(),
  },
  (t) => [
    index("vendor_contacts_vendor_id_idx").on(t.vendorId),
    uniqueIndex("vendor_contacts_primary_idx")
      .on(t.vendorId)
      .where(sql`is_primary`),
  ],
)

/**
 * A departure's costed supplier sheet: each thing it needs, with vendor, rate,
 * quote and booking status, due dates and what has been paid. A row can exist
 * before a vendor is chosen (status needed).
 */
export const departureServices = pgTable(
  "departure_services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    departureId: uuid("departure_id")
      .notNull()
      .references(() => departures.id, { onDelete: "restrict" }),
    vendorId: uuid("vendor_id").references(() => vendors.id, {
      onDelete: "restrict",
    }),
    category: vendorCategory("category").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    /** Tier served when the line is for one tier; NULL = everyone. */
    ageBand: ageBand("age_band"),
    startsOn: date("starts_on"),
    endsOn: date("ends_on"),
    startTime: time("start_time"),
    status: serviceStatus("status").notNull().default("needed"),
    rateUnit: rateUnit("rate_unit").notNull().default("flat"),
    unitRateCents: integer("unit_rate_cents"),
    quantity: numeric("quantity", { precision: 10, scale: 2 })
      .notNull()
      .default("1"),
    currency: text("currency").notNull(),
    /** Generated by the database: round(unit_rate_cents * quantity). Read-only. */
    totalCents: integer("total_cents").generatedAlwaysAs(
      sql`round(unit_rate_cents * quantity)::integer`,
    ),
    usdEstimateCents: integer("usd_estimate_cents"),
    quoteValidUntil: date("quote_valid_until"),
    confirmationRef: text("confirmation_ref"),
    depositDueOn: date("deposit_due_on"),
    balanceDueOn: date("balance_due_on"),
    paidCents: integer("paid_cents").notNull().default(0),
    cancellationTerms: text("cancellation_terms"),
    notes: text("notes"),
    ...auditColumns(),
  },
  (t) => [
    index("departure_services_departure_idx").on(t.departureId, t.startsOn),
    index("departure_services_vendor_id_idx").on(t.vendorId),
    index("departure_services_status_idx").on(t.status),
    index("departure_services_payables_idx")
      .on(t.balanceDueOn)
      .where(sql`status IN ('held', 'confirmed')`),
    check(
      "departure_services_vendor_check",
      sql`vendor_id IS NOT NULL OR status IN ('needed', 'cancelled')`,
    ),
    check(
      "departure_services_dates_check",
      sql`starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on`,
    ),
    check(
      "departure_services_amounts_check",
      sql`(unit_rate_cents IS NULL OR unit_rate_cents >= 0) AND quantity > 0 AND paid_cents >= 0`,
    ),
    check("departure_services_currency_check", sql`currency ~ '^[a-z]{3}$'`),
  ],
)

/**
 * Links (never files) to contracts, quotes, invoices, insurance, licences,
 * background checks, signed terms and waivers, with status and expiry.
 * Explicit nullable foreign keys, at least one set; no polymorphic pair.
 * Never link a medical form or a passport scan.
 */
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    kind: documentKind("kind").notNull(),
    status: documentStatus("status").notNull().default("requested"),
    url: text("url"),
    vendorId: uuid("vendor_id").references(() => vendors.id, {
      onDelete: "restrict",
    }),
    departureServiceId: uuid("departure_service_id").references(
      () => departureServices.id,
      { onDelete: "restrict" },
    ),
    departureId: uuid("departure_id").references(() => departures.id, {
      onDelete: "restrict",
    }),
    bookingId: uuid("booking_id").references(() => bookings.id, {
      onDelete: "restrict",
    }),
    datedOn: date("dated_on"),
    expiresOn: date("expires_on"),
    notes: text("notes"),
    ...auditColumns(),
  },
  (t) => [
    index("documents_vendor_id_idx").on(t.vendorId),
    index("documents_departure_service_id_idx").on(t.departureServiceId),
    index("documents_departure_id_idx").on(t.departureId),
    index("documents_booking_id_idx").on(t.bookingId),
    index("documents_expires_on_idx")
      .on(t.expiresOn)
      .where(sql`expires_on IS NOT NULL`),
    check(
      "documents_owner_check",
      sql`num_nonnulls(vendor_id, departure_service_id, departure_id, booking_id) >= 1`,
    ),
    check(
      "documents_url_check",
      sql`url IS NULL OR url LIKE 'https://%'`,
    ),
    check(
      "documents_url_required_check",
      sql`status NOT IN ('sent', 'on_file') OR url IS NOT NULL`,
    ),
  ],
)

/**
 * Dated log of emails, calls, meetings and notes with a family or vendor or
 * about a departure, with an optional follow-up date. Open follow-ups are the
 * to-do list. Free text: no health details, children's names or passport
 * numbers.
 */
export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    familyId: uuid("family_id").references(() => families.id, {
      onDelete: "cascade",
    }),
    vendorId: uuid("vendor_id").references(() => vendors.id, {
      onDelete: "cascade",
    }),
    departureId: uuid("departure_id").references(() => departures.id, {
      onDelete: "cascade",
    }),
    kind: interactionKind("kind").notNull().default("note"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    summary: text("summary").notNull(),
    followUpOn: date("follow_up_on"),
    followUpDoneAt: timestamp("follow_up_done_at", { withTimezone: true }),
    ...auditColumns(),
  },
  (t) => [
    index("interactions_family_idx").on(t.familyId, t.occurredAt.desc()),
    index("interactions_vendor_idx").on(t.vendorId, t.occurredAt.desc()),
    index("interactions_departure_idx").on(t.departureId, t.occurredAt.desc()),
    index("interactions_open_follow_ups_idx")
      .on(t.followUpOn)
      .where(sql`follow_up_on IS NOT NULL AND follow_up_done_at IS NULL`),
    check(
      "interactions_subject_check",
      sql`num_nonnulls(family_id, vendor_id, departure_id) >= 1`,
    ),
  ],
)

export type Departure = typeof departures.$inferSelect
export type NewDeparture = typeof departures.$inferInsert
export type Family = typeof families.$inferSelect
export type NewFamily = typeof families.$inferInsert
export type Traveller = typeof travellers.$inferSelect
export type NewTraveller = typeof travellers.$inferInsert
export type Booking = typeof bookings.$inferSelect
export type NewBooking = typeof bookings.$inferInsert
export type BookingTraveller = typeof bookingTravellers.$inferSelect
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
export type Vendor = typeof vendors.$inferSelect
export type NewVendor = typeof vendors.$inferInsert
export type VendorContact = typeof vendorContacts.$inferSelect
export type DepartureService = typeof departureServices.$inferSelect
export type NewDepartureService = typeof departureServices.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type Interaction = typeof interactions.$inferSelect
export type NewInteraction = typeof interactions.$inferInsert
