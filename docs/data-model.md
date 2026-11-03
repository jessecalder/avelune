# Avelune data model

Status: operating model added in migrations `0002_operating_model` and `0003_table_comments`; private payment links (`payment_links`) added in `0005_payment_links` and `0006_payment_links_comments`. The Drizzle source is `src/db/schema.ts`.

This is the data dictionary for the Avelune database: every table and column, what it is for, who fills it in, and what is private. It is also the reference for anyone pointing a spreadsheet-style admin tool (NocoDB) or custom admin pages at the database.

## How to read this

- **Stage 1** (live): `signups`. **Stage 2** (built, gated off): `reservations`, `stripe_events`. The twelve tables below the line are the **operating model** that runs the business behind them: customers, travellers, bookings, payments, suppliers, paperwork and a contact log.
- The existing app tables (`signups`, `reservations`, `stripe_events`) are not changed. The new tables point at them; nothing points the other way.
- **Comments live in the database.** Every table, column and the booking sequence has a `COMMENT ON` statement in `drizzle/0003_table_comments.sql`, and `payment_links` in `drizzle/0006_payment_links_comments.sql` (Drizzle 0.45 has no column-comment API, so they are custom migrations). NocoDB, TablePlus, DBeaver and `psql \d+` all read them. The same text is in the Notes column below. If you add a column, add its comment in a new migration and its row here; `src/db/schema.test.ts` fails if a column has no comment or no row in this file.
- **Who fills it in.** "Jesse" means by hand, in NocoDB or in a future admin page. "Database" means the database fills it (defaults, sequences, generated columns, triggers): do not type it. "Booking form" means a form that does not exist yet and must not be simulated by hand (see Privacy). "App" means the Avelune application writes it (admin pages, the customer payment page, the Stripe webhook): do not edit it by hand.
- **Privacy column.** *Personal* = an adult's contact data. *Booking-stage* = collect only after the privacy page is updated (below). *SENSITIVE (gated)* = children's names, dates of birth, health data: the database refuses it until a consent version is recorded. *Free text* = a notes field: never put health details, children's names or passport numbers in it. *Vendor person* = a private individual or a named person at a supplier. *Capability token* = a secret that grants access to one page on its own.

## Conventions

- snake_case names; a uuid `id` primary key on every table (`gen_random_uuid()`), so every row has one simple key in a spreadsheet tool.
- `created_at` and `updated_at` (timestamptz) on every table. On the twelve operating-model tables a database trigger (`set_updated_at`) stamps `updated_at` on every update, so edits made in NocoDB count. The three app tables rely on the app.
- Money is an integer in minor units (cents) with a lowercase ISO 4217 `currency` ('usd', 'eur', 'gtq'), enforced by a CHECK. Never floats.
- Dates the traveller thinks of as calendar days (`starts_on`, `due_on`) are `date`; moments are `timestamptz`.
- Enums are lowercase snake_case words (age bands are `age_3_5`, not "3–5", so they are easy to type in a filter). 'Derived' states (a full departure, an overdue payment, an expired document) are queries, not stored values, so they cannot go stale.
- Every foreign key has an explicit ON DELETE rule. Rule of thumb: money, contract and supplier history = RESTRICT (cancel or deactivate, don't delete); pure children = CASCADE; references into the app-owned tables = SET NULL.
- No polymorphic type/id pairs. `documents` and `interactions` use one nullable foreign key per possible owner and a CHECK that at least one is set.
- Migrations ship with the next deploy (`pnpm db:migrate && pnpm start`). Migrations 0002, 0003, 0005 and 0006 only create objects and comments; they alter no existing table or row.

## Overview of the relationships

```
signups 1 ── 0..1 families            (families.signup_id, SET NULL; promoted by hand)
families 1 ── n travellers            (CASCADE; people in the household, one row each)
families 1 ── n bookings              (RESTRICT)
departures 1 ── n bookings            (RESTRICT; at most one live booking per family per departure)
bookings n ── n travellers            via booking_travellers (booking CASCADE, traveller RESTRICT;
                                      a trigger requires the same family). age_band here = the tier
                                      on this departure.
bookings 1 ── n payments              (RESTRICT)
payments 1 ── n payment_links         (CASCADE; at most one live link per payment, the rest are history)
reservations 1 ── 0..1 payments       (payments.reservation_id, SET NULL; the Stripe Checkout deposit)

vendors 1 ── n vendor_contacts        (CASCADE)
departures 1 ── n departure_services  (RESTRICT)
vendors 1 ── n departure_services     (RESTRICT; vendor_id NULL = slot not yet sourced)

documents ── vendors | departure_services | departures | bookings
                                      (one nullable FK each, at least one set)
interactions ── families | vendors | departures
                                      (one nullable FK each, at least one set; CASCADE)

journey enum (san-sebastian, antigua) is shared by reservations, departures and vendors.
```

Flow of a family: signup → (optional) reservation (Stripe Checkout deposit, webhook unchanged) → family + booking + a deposit `payments` row pointing at the reservation → travellers on the booking → instalment and balance `payments` rows → trip. While each journey has exactly one 2027 departure, `reservations.journey` identifies the departure unambiguously.

## Enums

| Enum | Values | Why |
|---|---|---|
| `age_band` | `under_3`, `age_3_5`, `age_6_9`, `age_10_13`, `age_14_17`, `adult` | The four product tiers named on the site and privacy page, plus adult and under_3 (so a toddler sibling is recorded honestly instead of mis-filed as 3–5). Snake_case values avoid the en dash in the site copy. |
| `booking_status` | `waitlisted`, `held`, `confirmed`, `cancelled`, `completed` | held matches today's 14-day refundable deposit, confirmed means terms accepted, waitlisted handles a full departure. Unpaid Checkout attempts stay in reservations. |
| `departure_status` | `planning`, `open`, `closed`, `completed`, `cancelled` | Sales lifecycle only. 'Full' is derived from active bookings and 'guaranteed' is its own fact (guaranteed_at). |
| `document_kind` | `contract`, `quote`, `invoice`, `insurance`, `licence`, `background_check`, `waiver`, `terms`, `other` | The paperwork a children's travel operator must hold or chase. |
| `document_status` | `requested`, `draft`, `sent`, `on_file`, `void` | Answers 'what have I asked for and not received' and 'what is unsigned'. Expired is derived from expires_on. |
| `family_status` | `lead`, `in_conversation`, `booked`, `travelled`, `inactive` | Jesse's sales pipeline in five words, set by hand so 'warm' can be recorded before money moves. |
| `interaction_kind` | `email`, `call`, `video`, `meeting`, `message`, `note` | Enough to filter the log by channel. note covers internal thoughts and pure to-dos. |
| `journey` | `san-sebastian`, `antigua` | Existing enum (reservations.journey), reused on departures.journey and vendors.journey in place of a trips table. A new destination is an additive ALTER TYPE ... ADD VALUE, which ships with the site-copy deploy that a new destination needs anyway. |
| `payment_kind` | `deposit`, `instalment`, `balance`, `extra` | The parts of a group-travel payment schedule. Refunds are tracked on the row they reverse, not as negative rows. |
| `payment_method` | `stripe`, `bank_transfer`, `check`, `other` | Five-figure balances are often wired; recording the method keeps reconciliation possible. |
| `payment_status` | `scheduled`, `invoiced`, `paid`, `refunded`, `waived`, `cancelled` | scheduled plus due_on makes the table a payment calendar. Overdue is derived. |
| `rate_unit` | `flat`, `per_person`, `per_family`, `per_night`, `per_room_night`, `per_hour`, `per_day` | How vendors quote, so total_cents = rate × quantity can be generated. |
| `reservation_status` | `pending`, `paid`, `refunded`, `expired`, `cancelled` | Existing enum. |
| `service_status` | `needed`, `requested`, `quoted`, `held`, `confirmed`, `declined`, `cancelled` | Life of a supplier line from empty slot to confirmed booking; held covers provisional room or option holds. |
| `signup_status` | `pending`, `confirmed`, `unsubscribed` | Existing enum. |
| `vendor_category` | `accommodation`, `host`, `guide`, `transport`, `restaurant`, `activity`, `other` | The supplier types in the product description; shared by vendors and departure_services. |
| `vendor_status` | `prospect`, `contacted`, `approved`, `contracted`, `declined`, `inactive` | The supply-building pipeline. Quote states live on the service line. |

## Operating-model tables

### `departures`

One dated run of a journey, e.g. San Sebastián 10–19 July 2027. Holds the capacity, the minimum needed to run, and the go/no-go fact (guaranteed_at). Bookings, service lines, documents and interactions hang off it. The existing journey enum is reused in place of a separate trips table.

- **Filled in by:** Jesse, by hand or in NocoDB.
- **Privacy:** Business data only; no customer personal data. The notes column must not hold children's names or health details.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `code` | text | no |  | Jesse |  | Short human code, unique, e.g. 'SSB-2027-07', 'ANT-2027-08'. Used in emails, Stripe metadata and vendor messages. |
| `journey` | journey | no |  | Jesse |  | Which journey this runs (san-sebastian, antigua). Same enum as reservations.journey, so a deposit resolves to its departure while each journey has one departure. |
| `name` | text | no |  | Jesse |  | Display name, e.g. 'San Sebastián, July 2027'. NocoDB's display value. |
| `starts_on` | date | no |  | Jesse |  | First day, local date at the destination. |
| `ends_on` | date | no |  | Jesse |  | Last day, local date. Must be after starts_on. |
| `status` | departure_status | no | `'planning'` | Jesse |  | Sales lifecycle: planning, open, closed, completed, cancelled. 'Full' is derived from bookings, not stored. |
| `min_families` | smallint | no | `6` | Jesse |  | Families needed for the departure to run. |
| `max_families` | smallint | no | `10` | Jesse |  | Capacity in families. |
| `guaranteed_at` | timestamp with time zone | yes |  | Jesse |  | When Jesse declared that it will run (minimum reached or underwritten). NULL = not yet guaranteed. Kept separate from status because a departure can be guaranteed and still open. |
| `currency` | text | no | `'usd'` | Jesse |  | Currency families are charged in. Lowercase ISO 4217, as Stripe and reservations.currency use. |
| `balance_due_on` | date | yes |  | Jesse |  | Default due date for the final balance, used when building a booking's payments rows (e.g. 90 days before starts_on). |
| `price_note` | text | yes |  | Jesse |  | Pricing in words while the pricing model is unsettled, e.g. 'from $X per family of four'. The agreed price is bookings.total_price_cents. |
| `notes` | text | yes |  | Jesse | Free text | Planning notes. No health details and no children's names. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change. Kept current by the set_updated_at trigger, so NocoDB edits update it too. |

Keys and rules:

- UNIQUE (code); UNIQUE (journey, starts_on)
- CHECK ends_on > starts_on; CHECK min_families >= 1 AND max_families >= min_families; CHECK currency is three lowercase letters

### `families`

The customer: one row per household Avelune is talking to or travelling with. Usually promoted by hand from an early-access signup. The signup row stays as the marketing-consent record; the family is the operational customer. The primary contact's details live here, so there is no separate contacts table for customers.

- **Filled in by:** Jesse, by hand or in NocoDB (promoting a signup). Later: the booking form and the Stripe webhook.
- **Privacy:** An adult's contact data. Email and first name are already covered by today's notice (they come from the signup). Last names, phone, home city and the Stripe customer id are booking-stage data: collect only after the privacy page is updated. Erasure of a booked family is by anonymising, not deleting (see Retention).

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `signup_id` | uuid | yes |  | Jesse | Personal | The early-access signup this family came from, if any (unique). SET NULL means honouring a deletion request on the signup does not erase a live booking. |
| `family_name` | text | no |  | Jesse |  | How we refer to the household, e.g. 'The Ortiz family'. |
| `primary_contact_name` | text | yes |  | Jesse | Personal | Name of the adult who books and pays. Only a first name until the booking-stage privacy notice is live (that is all the signup collects). |
| `email` | text | no |  | Jesse | Personal | Primary contact email, as typed, trimmed. |
| `email_key` | text | no | `generated: lower(btrim(email))` | Database |  | Dedupe key (unique). Generated by the database with the same rule as signups.email_key, so it can never drift and nobody types it in NocoDB. Read-only. |
| `phone` | text | yes |  | Jesse | Booking-stage | BOOKING STAGE: collect only after the privacy page is updated. Mobile in E.164 (e.g. +14155550123), for trip-week WhatsApp/SMS. |
| `home_city` | text | yes |  | Jesse | Booking-stage | BOOKING STAGE: collect only after the privacy page is updated. City and state, e.g. 'Austin, TX', for flights and time zones. No street address. |
| `country_code` | text | no | `'US'` | Jesse |  | Country of residence, ISO 3166-1 alpha-2, uppercase. |
| `status` | family_status | no | `'lead'` | Jesse |  | Hand-set pipeline stage: lead, in_conversation, booked, travelled, inactive. A judgement for filtering, not derived from bookings. |
| `source` | text | yes |  | Jesse |  | How they found Avelune, free text, e.g. 'early_access', 'referral: Lopez family'. |
| `stripe_customer_id` | text | yes |  | Jesse | Booking-stage | Stripe Customer (cus_...), unique, copied from the first paid reservation, so deposit, instalment invoices and refunds sit on one Stripe customer. |
| `notes` | text | yes |  | Jesse | Free text | Standing notes (who decides, preferences, tone). Dated events go in interactions. Never record health details, children's names or passport numbers here. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- UNIQUE (email_key); UNIQUE (signup_id), NULLs allowed; UNIQUE (stripe_customer_id), NULLs allowed
- CHECK country_code is two uppercase letters
- FK `signup_id` → `signups.id` ON DELETE SET NULL

### `travellers`

The clearly separated traveller table: every person in a family (parents, children, grandparents, a nanny), listed once and attached to departures through booking_travellers. This is the ONLY table allowed to hold children's personal data. Its sensitive columns (a child's names, anyone's date of birth, dietary, allergies, medical notes) are nullable and are collected only at booking, after the privacy page is updated. A row-local CHECK keeps them NULL until a booking-stage consent version is recorded on the row, so the rule also holds for edits made in NocoDB. Passports and government IDs are never stored, here or anywhere else.

- **Filled in by:** Jesse for non-sensitive rows (labels and age bands, created from a signup's bands). The booking form (not built) for names, dates of birth and health fields.
- **Privacy:** Children's data lives only here. Safe today: age_band and label (no names). Gated until the privacy page is updated: a child's first_name and last_name, anyone's date_of_birth, dietary, allergies, medical_notes. Children's email and phone are blocked outright. Sensitive fields are deleted 90 days after the trip (sensitive_purge_after).

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `family_id` | uuid | no |  | Jesse |  | Household this person belongs to. Deleting a family (erasure) removes its people, unless booking_travellers RESTRICT blocks it because they are on a booking. |
| `age_band` | age_band | no |  | Jesse |  | Current band: under_3, age_3_5, age_6_9, age_10_13, age_14_17 or adult, as the parent gave it (signup '3–5' maps to age_3_5). The tier for a specific trip is booking_travellers.age_band. |
| `label` | text | no |  | Jesse |  | Non-identifying display label, e.g. 'Parent: Jesse', 'Child A (6–9)'. Lets lists and headcounts work without naming any child. |
| `relationship` | text | yes |  | Jesse |  | Adults only: role in plain words, e.g. 'parent', 'grandmother', 'nanny'. |
| `first_name` | text | yes |  | Booking form | SENSITIVE (gated) | Adults: allowed. CHILDREN: SENSITIVE: collect only at booking, after the privacy page is updated. Blocked by travellers_sensitive_gate_check until sensitive_consent_version is set. |
| `last_name` | text | yes |  | Booking form | SENSITIVE (gated) | Adults: booking-stage data. CHILDREN: SENSITIVE: collect only at booking, after the privacy page is updated (same gate). |
| `email` | text | yes |  | Jesse | Personal | Adults only (CHECK): a second adult's email for trip messages. Always NULL for children. |
| `phone` | text | yes |  | Jesse | Personal | Adults only (CHECK): mobile in E.164 for use during the trip. Always NULL for children. |
| `date_of_birth` | date | yes |  | Booking form | SENSITIVE (gated) | SENSITIVE, any age: collect only at booking, after the privacy page is updated, and only if an insurer, airline or vendor requires it. age_band runs the tiers without it. |
| `dietary` | text | yes |  | Booking form | SENSITIVE (gated) | SENSITIVE (can reveal health or religion): collect only at booking, after the privacy page is updated. What restaurants need, e.g. 'vegetarian'. |
| `allergies` | text | yes |  | Booking form | SENSITIVE (gated) | SENSITIVE (health): collect only at booking, after the privacy page is updated. Allergen and severity, e.g. 'tree nuts, carries an EpiPen'. |
| `medical_notes` | text | yes |  | Booking form | SENSITIVE (gated) | SENSITIVE (health): collect only at booking, after the privacy page is updated. Only what a host needs to keep this person safe (e.g. 'asthma, inhaler in backpack'). No diagnoses beyond that. |
| `sensitive_consent_version` | text | yes |  | Booking form |  | Version of the booking-stage privacy notice under which a parent supplied this row's sensitive fields. Set only by the booking form from the published notice version. Never type it by hand before that notice is live. Required by the gate CHECK before any sensitive field can be filled. |
| `sensitive_consent_at` | timestamp with time zone | yes |  | Booking form |  | When that consent was given. |
| `sensitive_purge_after` | date | yes |  | Booking form |  | Date after which a scheduled job sets the sensitive fields (and a child's names) to NULL: the departure's ends_on + 90 days. Required by the gate CHECK whenever consent is recorded. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- CHECK travellers_child_contact_check: age_band = 'adult' OR (email IS NULL AND phone IS NULL)
- CHECK travellers_sensitive_gate_check: date_of_birth, dietary, allergies, medical_notes (and a child's first_name / last_name) must be NULL unless sensitive_consent_version, sensitive_consent_at and sensitive_purge_after are all set
- Index on sensitive_purge_after (non-null rows) for the purge job
- FK `family_id` → `families.id` ON DELETE CASCADE

### `bookings`

A family's place on a departure, from waitlist or held deposit to completed trip. Holds the agreed price, terms and privacy acceptance, and the arrival and departure logistics that transfers are planned from. Money owed and paid lives in payments. Party size comes from booking_travellers and is not duplicated as counts.

- **Filled in by:** Jesse, by hand or in NocoDB. Later: the booking flow after a Stripe deposit.
- **Privacy:** Price, terms and privacy acceptance, and arrival/departure flight details (personal, booking-stage, not special-category). Collect arrival and departure details only once privacy_version is set. The notes column must not hold health details or children's names.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `ref` | text | no | `('AV-' \|\| lpad(nextval('booking_ref_seq')::text, 4, '0'))` | Database |  | Human booking reference, unique, e.g. 'AV-0007'. Filled by a sequence so NocoDB inserts get one automatically. Quoted to families, vendors and Stripe metadata. |
| `family_id` | uuid | no |  | Jesse |  | The booking family. RESTRICT: a family with booking and payment history cannot be deleted. Anonymise it instead (see privacy). |
| `departure_id` | uuid | no |  | Jesse |  | The departure booked. RESTRICT: cancel a departure, don't delete it. |
| `status` | booking_status | no | `'held'` | Jesse |  | waitlisted, held (refundable deposit, deciding), confirmed, cancelled, completed. Cancelled rows are kept. |
| `total_price_cents` | integer | yes |  | Jesse |  | Agreed total for this booking in minor units of currency, after any founding-family discount. NULL while only held. Balance due = this minus the net of paid payments. |
| `currency` | text | no | `'usd'` | Jesse |  | Lowercase ISO 4217; normally the departure's currency. |
| `held_until` | timestamp with time zone | yes |  | Jesse |  | End of the free-hold window (copied from reservations.hold_expires_at, or set by hand for a wired deposit). |
| `terms_version` | text | yes |  | Jesse |  | Version of the booking terms accepted, e.g. '2027-01'. |
| `terms_accepted_at` | timestamp with time zone | yes |  | Jesse |  | When terms_version was accepted. |
| `privacy_version` | text | yes |  | Jesse |  | Version of the booking-stage privacy notice the family accepted. Phone, home city, last names and arrival details are collected only once this is set. |
| `privacy_accepted_at` | timestamp with time zone | yes |  | Jesse |  | When privacy_version was accepted. |
| `confirmed_at` | timestamp with time zone | yes |  | Jesse |  | When status became confirmed. |
| `cancelled_at` | timestamp with time zone | yes |  | Jesse |  | When status became cancelled. |
| `cancellation_reason` | text | yes |  | Jesse |  | Short reason, for refund decisions and learning. |
| `arrives_at` | timestamp with time zone | yes |  | Jesse | Booking-stage | BOOKING STAGE: planned arrival at the destination airport or station, for transfers. |
| `arrival_details` | text | yes |  | Jesse | Booking-stage | BOOKING STAGE: flight or train and airport, e.g. 'IB 3456 into BIO'. |
| `departs_at` | timestamp with time zone | yes |  | Jesse | Booking-stage | BOOKING STAGE: planned departure from the destination. |
| `departure_details` | text | yes |  | Jesse | Booking-stage | BOOKING STAGE: outbound flight or train details. |
| `notes` | text | yes |  | Jesse | Free text | Booking notes, e.g. rooming wishes or a discount reason. No health details and no children's names. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- UNIQUE (ref); at most one non-cancelled booking per (family_id, departure_id)
- Indexes on (departure_id, status) and (family_id)
- CHECK total_price_cents >= 0 when set; CHECK currency is three lowercase letters
- ref defaults from sequence booking_ref_seq ('AV-0001', ...)
- FK `family_id` → `families.id` ON DELETE RESTRICT
- FK `departure_id` → `departures.id` ON DELETE RESTRICT

### `booking_travellers`

Which members of the family are going on this booking, and the age tier each one joins on that departure. Headcount per tier per departure is a query on this table, and it sets how many hosts each tier needs.

- **Filled in by:** Jesse, by hand or in NocoDB.
- **Privacy:** Links only (ids and an age band); no personal data of its own.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key (one simple key for spreadsheet tools). |
| `booking_id` | uuid | no |  | Jesse |  | The booking. The roster has no meaning without it. |
| `traveller_id` | uuid | no |  | Jesse |  | The person. RESTRICT stops a traveller on a booking from being deleted unnoticed. A trigger checks that the traveller belongs to the booking's family. |
| `age_band` | age_band | no |  | Jesse |  | Tier on this departure (the host group this person joins). Can differ from travellers.age_band when a birthday falls between booking and travel. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- UNIQUE (booking_id, traveller_id)
- Trigger booking_travellers_same_family (migration 0003): the traveller must belong to the booking's family
- FK `booking_id` → `bookings.id` ON DELETE CASCADE
- FK `traveller_id` → `travellers.id` ON DELETE RESTRICT

### `payments`

The payment schedule and record for a booking: one row per amount the family owes or has paid (deposit, instalments, balance, extras), with due date, status, method and Stripe references. Refunds are tracked on the row they reverse. The deposit row links to the existing reservations row that took it, which is how a booking grows out of a Stripe deposit without touching reservations.

- **Filled in by:** Jesse, by hand or in NocoDB. Later: the Stripe webhook (match on stripe_payment_intent_id / stripe_invoice_id).
- **Privacy:** Amounts and Stripe ids only. Card data is never stored; Stripe holds it. Kept 7 years for US tax and accounting.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `booking_id` | uuid | no |  | Jesse |  | The booking this money belongs to. RESTRICT: payment history is never cascaded away. |
| `kind` | payment_kind | no |  | Jesse |  | deposit, instalment, balance, extra (an add-on such as an extra night). |
| `label` | text | yes |  | Jesse |  | Family-facing line, e.g. 'Second instalment'. |
| `status` | payment_status | no | `'scheduled'` | Jesse |  | scheduled, invoiced (Stripe invoice or link sent), paid, refunded (fully), waived, cancelled. 'Overdue' is derived (due_on < today and status scheduled/invoiced), not stored. A partial refund keeps status paid. |
| `method` | payment_method | no | `'stripe'` | Jesse |  | stripe, bank_transfer, check, other. Five-figure balances are often wired. |
| `amount_cents` | integer | no |  | Jesse |  | Amount due, in minor units, always positive. |
| `currency` | text | no | `'usd'` | Jesse |  | Lowercase ISO 4217; must match the booking's currency (checked in the app). |
| `due_on` | date | no |  | Jesse |  | Date due. For a payment taken on the spot (e.g. the Checkout deposit), the day it was taken. |
| `paid_at` | timestamp with time zone | yes |  | Jesse |  | When the money cleared. Required when status is paid or refunded. |
| `amount_refunded_cents` | integer | no | `0` | Jesse |  | Total refunded against this row, between 0 and amount_cents. Net received = amount_cents − amount_refunded_cents. |
| `refunded_at` | timestamp with time zone | yes |  | Jesse |  | When the latest refund was issued. |
| `reservation_id` | uuid | yes |  | Jesse |  | For kind = deposit only: the existing Stripe Checkout deposit (reservations row) that paid it. Unique, so a deposit is counted once. |
| `stripe_checkout_session_id` | text | yes |  | Jesse |  | Stripe Checkout Session (cs_...) when paid through Checkout. |
| `stripe_payment_intent_id` | text | yes |  | Jesse |  | Stripe PaymentIntent (pi_...) that settled it, unique. The webhook matches on this. |
| `stripe_invoice_id` | text | yes |  | Jesse |  | Stripe Invoice (in_...) when sent as a hosted invoice, unique. |
| `notes` | text | yes |  | Jesse | Free text | e.g. wire reference, 'waived: founding family', refund reason. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- UNIQUE (reservation_id); UNIQUE (stripe_payment_intent_id); UNIQUE (stripe_invoice_id); NULLs allowed
- CHECK amount_cents > 0 AND amount_refunded_cents BETWEEN 0 AND amount_cents
- CHECK paid_at is set when status is paid or refunded; CHECK refunded means amount_refunded_cents = amount_cents
- CHECK reservation_id only when kind = 'deposit'; CHECK currency is three lowercase letters
- FK `booking_id` → `bookings.id` ON DELETE RESTRICT
- FK `reservation_id` → `reservations.id` ON DELETE SET NULL

### `payment_links`

A private pay-by-link for one `payments` row. The family opens `/pay/<token>`, a page linked from nowhere on the site, and pays through Stripe Checkout; the admin sends the link by email and watches this row for progress (sent, opened, at checkout, bank payment clearing). The `payments` row stays the money record: paid and refunded come from `payments.status`, never from here. A payment has at most one live link; cancelled and replaced links stay as history.

- **Filled in by:** the app (the admin pages create and cancel links; the customer page counts opens; the Stripe webhook and the return page record checkout and bank-payment state). Jesse should not edit these by hand.
- **Privacy:** The token is a capability: anyone holding it can open the payment page for that one payment (family name, journey, dates, booking ref, amount; never children's names, travellers, emails or notes). Keep it out of shared sheets and logs. `email_sent_to` is an adult's email address (personal data, the same address as `families.email` unless edited when sending). The page does not hold card data; Stripe does.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `payment_id` | uuid | no |  | App |  | The payment this link collects. CASCADE: a link is only a way to pay and means nothing without its payment. |
| `token` | text | no |  | App | Capability token | The secret in the link: 32 random bytes, base64url, 43 characters (checked), unique. Anyone holding it can open the payment page, so it is only ever shown to the admin and emailed to the family. |
| `expires_at` | timestamp with time zone | yes |  | App |  | Optional "link works until". NULL = never expires. After this moment the page says the link is no longer active. |
| `cancelled_at` | timestamp with time zone | yes |  | App |  | Set when the link is cancelled or replaced by a new one. NULL = live. A partial unique index allows one live link per payment. |
| `email_sent_at` | timestamp with time zone | yes |  | App |  | Last time the link was emailed to the family, by the app or marked by hand ("I sent it myself"). |
| `email_sent_to` | text | yes |  | App | Personal | Address of that last send. |
| `email_send_count` | smallint | no | `0` | App |  | How many times the link has been emailed (sends and hand-marked sends). |
| `first_opened_at` | timestamp with time zone | yes |  | App |  | First time someone other than the admin opened the page. Email security scanners that pre-fetch links can set this. |
| `last_opened_at` | timestamp with time zone | yes |  | App |  | Most recent non-admin view. |
| `open_count` | integer | no | `0` | App |  | Non-admin views of the page. |
| `checkout_session_id` | text | yes |  | App |  | Latest Stripe Checkout Session (cs_...) created for this link, unique. Cleared when Stripe reports it expired. |
| `checkout_started_at` | timestamp with time zone | yes |  | App |  | Latest time the family was sent to Stripe checkout. |
| `processing_since` | timestamp with time zone | yes |  | App |  | Set when a bank payment (ACH and similar) was submitted and has not cleared yet; cleared when it succeeds or fails. While set the page shows "your payment is on its way". |
| `last_failed_at` | timestamp with time zone | yes |  | App |  | Last time a bank payment through this link failed. The link works again afterwards. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- UNIQUE (token); UNIQUE (checkout_session_id), NULLs allowed
- UNIQUE (payment_id) WHERE cancelled_at IS NULL: one live link per payment
- Index on payment_id (the history of a payment's links)
- CHECK token is 43 base64url characters; CHECK open_count and email_send_count are not negative
- FK `payment_id` → `payments.id` ON DELETE CASCADE

### `vendors`

Every supplier, replacing the vendor spreadsheet: houses and small hotels, age-tier hosts (freelance people are vendors too), private guides, transfer companies, restaurants and activity operators. Records type, destination, location, sourcing status, terms and Jesse's rating. People at the vendor go in vendor_contacts. What they supply for each departure, at what rate, goes in departure_services.

- **Filled in by:** Jesse, by hand or in NocoDB.
- **Privacy:** When is_individual is true (most hosts and guides) the row is personal data of a private person, many in Spain (GDPR, legitimate-interest basis) and Guatemala. Delete individual vendors 2 years after their last service line, keeping only the name on rows tied to 7-year cost records.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `name` | text | no |  | Jesse | Vendor person | Trading name, or the person's full name for a freelance host or guide. |
| `category` | vendor_category | no |  | Jesse |  | Main type: accommodation, host, guide, transport, restaurant, activity, other. A service line can be a different category (a hotel can sell a dinner). |
| `is_individual` | boolean | no | `false` | Jesse |  | True for a private person (most hosts and guides). Their details are personal data with their own retention (see privacy). |
| `status` | vendor_status | no | `'prospect'` | Jesse |  | Sourcing pipeline: prospect, contacted, approved (vetted, OK to book), contracted, declined, inactive. Set inactive rather than deleting. |
| `journey` | journey | yes |  | Jesse |  | Destination served. NULL = not tied to one destination (e.g. an insurer). |
| `city` | text | yes |  | Jesse |  | City or town where they operate. |
| `country_code` | text | yes |  | Jesse |  | ISO 3166-1 alpha-2, uppercase, e.g. 'ES', 'GT'. |
| `website` | text | yes |  | Jesse |  | Website or listing URL. |
| `email` | text | yes |  | Jesse | Vendor person | General business inbox (or the freelancer's own email). |
| `phone` | text | yes |  | Jesse | Vendor person | Business phone or WhatsApp in E.164. |
| `default_currency` | text | yes |  | Jesse |  | Currency they quote in, lowercase ISO 4217 ('eur', 'gtq', 'usd'). Prefills departure_services.currency. |
| `payment_terms` | text | yes |  | Jesse |  | e.g. '30% on signing, balance 30 days before arrival'; how to pay them. |
| `rating` | smallint | yes |  | Jesse |  | Jesse's 1–5 judgement after a site visit or a trip. |
| `notes` | text | yes |  | Jesse | Free text | Quality notes, what to watch for. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- CHECK rating between 1 and 5 when set; CHECK country_code two uppercase letters; CHECK default_currency three lowercase letters
- Indexes on (category, journey), status, name

### `vendor_contacts`

People at a vendor: the owner, the reservations desk, the on-the-day driver. Kept separate because one vendor has several and roles matter during trip week. Optional for a freelancer whose vendor row is the person.

- **Filled in by:** Jesse, by hand or in NocoDB.
- **Privacy:** Work contact details of named people at suppliers (personal data under GDPR for Spanish contacts). Deleted with the vendor.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `vendor_id` | uuid | no |  | Jesse |  | The vendor. Contacts go with it. |
| `name` | text | no |  | Jesse | Vendor person | Person's name. |
| `role` | text | yes |  | Jesse |  | e.g. 'Owner', 'Reservations', 'Driver dispatch'. |
| `email` | text | yes |  | Jesse | Vendor person | Work email. |
| `phone` | text | yes |  | Jesse | Vendor person | Work phone, E.164. |
| `prefers_whatsapp` | boolean | no | `false` | Jesse |  | Reach them on WhatsApp first. |
| `language` | text | yes |  | Jesse |  | Preferred language, e.g. 'es', 'en', 'eu'. |
| `is_primary` | boolean | no | `false` | Jesse |  | The main contact. At most one per vendor. |
| `notes` | text | yes |  | Jesse | Free text | Working notes, e.g. best hours to call. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- At most one primary contact per vendor (UNIQUE (vendor_id) WHERE is_primary)
- FK `vendor_id` → `vendors.id` ON DELETE CASCADE

### `departure_services`

The departure's costed supplier sheet: each thing a departure needs (the house for nine nights, a host for the 6–9s, the arrival transfer, a dinner, a surf lesson), with the vendor, the rate and unit in the vendor's currency, the quote and booking status, the vendor's due dates and what has been paid. A row can exist before a vendor is chosen (status needed).

- **Filled in by:** Jesse, by hand or in NocoDB.
- **Privacy:** Business and cost data; no customer personal data. The notes column must not hold children's names or health details: hosts get those from the rooming and care sheets.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `departure_id` | uuid | no |  | Jesse |  | The departure this service is for. |
| `vendor_id` | uuid | yes |  | Jesse |  | Supplier. NULL = slot not yet sourced (status needed or cancelled only). RESTRICT keeps cost history; set the vendor inactive instead. |
| `category` | vendor_category | no |  | Jesse |  | What this line buys (same enum as vendors.category). |
| `title` | text | no |  | Jesse |  | Short line, e.g. 'Villa Miramar, 5 bedrooms, 9 nights' or 'Day 4 surf lesson, Zurriola'. |
| `description` | text | yes |  | Jesse |  | Detail and inclusions. |
| `age_band` | age_band | yes |  | Jesse |  | Tier served, when the line is for one tier (hosts, tier activities). NULL = everyone or several tiers (say which in title). |
| `starts_on` | date | yes |  | Jesse |  | First date of the service, local date. NULL until fixed. |
| `ends_on` | date | yes |  | Jesse |  | Last date. NULL or equal to starts_on for a single day. |
| `start_time` | time | yes |  | Jesse |  | Local start time (transfers, activities). |
| `status` | service_status | no | `'needed'` | Jesse |  | needed, requested, quoted, held, confirmed, declined, cancelled. |
| `rate_unit` | rate_unit | no | `'flat'` | Jesse |  | What unit_rate_cents is per: flat, per_person, per_family, per_night, per_room_night, per_hour, per_day. |
| `unit_rate_cents` | integer | yes |  | Jesse |  | Quoted rate per unit in the vendor's currency, minor units (cents, centavos). NULL until quoted. |
| `quantity` | numeric(10, 2) | no | `'1'` | Jesse |  | Number of units, e.g. 36 room-nights, 8.5 hours, 42 people. |
| `currency` | text | no |  | Jesse |  | Lowercase ISO 4217 of the quote ('eur', 'gtq', 'usd'). Prefilled from vendors.default_currency. |
| `total_cents` | integer | yes | `generated: round(unit_rate_cents * quantity)::integer` | Database |  | Computed total in the vendor's currency. Read-only (generated). |
| `usd_estimate_cents` | integer | yes |  | Jesse |  | Jesse's USD estimate at a planning exchange rate, for margin roll-ups per departure. Set by hand. |
| `quote_valid_until` | date | yes |  | Jesse |  | Quote or hold expiry; chase before this date. |
| `confirmation_ref` | text | yes |  | Jesse |  | Vendor's booking or confirmation number. |
| `deposit_due_on` | date | yes |  | Jesse |  | When Avelune owes the vendor its deposit. |
| `balance_due_on` | date | yes |  | Jesse |  | When Avelune owes the vendor the balance. |
| `paid_cents` | integer | no | `0` | Jesse |  | Paid to the vendor so far, same currency, kept by hand (there is no vendor payments ledger yet). |
| `cancellation_terms` | text | yes |  | Jesse |  | The vendor's cancellation and refund terms, for exposure planning. |
| `notes` | text | yes |  | Jesse | Free text | Logistics. No children's names or health details; hosts get those from the rooming and care sheets. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- CHECK vendor_id is set unless status is needed or cancelled
- CHECK ends_on >= starts_on; CHECK unit_rate_cents >= 0, quantity > 0, paid_cents >= 0; CHECK currency three lowercase letters
- total_cents is generated: round(unit_rate_cents * quantity)
- FK `departure_id` → `departures.id` ON DELETE RESTRICT
- FK `vendor_id` → `vendors.id` ON DELETE RESTRICT

### `documents`

Links (never files) to contracts, quotes, invoices, insurance certificates, licences, host background checks, signed booking terms and waivers, with status and expiry. For a children's programme that promises background-checked hosts, the key query is 'what lapses before the departure ends'. Uses explicit nullable foreign keys, at least one set, with no polymorphic type/id pair.

- **Filled in by:** Jesse, by hand or in NocoDB.
- **Privacy:** Links only. A host background check is criminal-records data (GDPR Art. 10 for Spanish hosts): store only the link, status and expiry, never its content; the file sits in access-controlled storage. Never link a medical form or a passport scan. Background-check documents are removed when the host stops working with Avelune. Documents tied to bookings are kept 7 years.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `title` | text | no |  | Jesse |  | e.g. 'Hotel Arbaso group contract 2027', 'Background check: M. Etxeberria'. |
| `kind` | document_kind | no |  | Jesse |  | contract, quote, invoice, insurance, licence, background_check, waiver, terms, other. |
| `status` | document_status | no | `'requested'` | Jesse |  | requested, draft, sent, on_file, void. 'Expired' is derived from expires_on, not stored. |
| `url` | text | yes |  | Jesse |  | https link to the file in Drive, Dropbox, DocuSign or Stripe. Access control lives there. Required once sent or on_file. Never link a medical form or a passport scan. |
| `vendor_id` | uuid | yes |  | Jesse |  | Vendor it belongs to (contract, insurance, licence, background check). |
| `departure_service_id` | uuid | yes |  | Jesse |  | The specific service line a quote or confirmation is for. A line with documents cannot be deleted until they are moved or deleted. |
| `departure_id` | uuid | yes |  | Jesse |  | Departure-wide document (run sheet, group insurance). |
| `booking_id` | uuid | yes |  | Jesse |  | Customer document (signed terms, waiver). |
| `dated_on` | date | yes |  | Jesse |  | Date signed or issued. |
| `expires_on` | date | yes |  | Jesse |  | Expiry. Insurance and background checks must cover the departure's ends_on; the admin view flags any that do not. |
| `notes` | text | yes |  | Jesse | Free text | Working notes. Never the content of a background check. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- CHECK at least one of vendor_id, departure_service_id, departure_id, booking_id is set
- CHECK url starts with https://; CHECK url is set once status is sent or on_file
- Index on expires_on (non-null rows)
- FK `vendor_id` → `vendors.id` ON DELETE RESTRICT
- FK `departure_service_id` → `departure_services.id` ON DELETE RESTRICT (contracts and invoices are never removed as a side effect)
- FK `departure_id` → `departures.id` ON DELETE RESTRICT
- FK `booking_id` → `bookings.id` ON DELETE RESTRICT

### `interactions`

A dated log of emails, calls, meetings, messages and notes with a family or vendor or about a departure, with an optional follow-up date. Answers 'what was last said to whom', and its open follow-ups are Jesse's to-do list (this replaces a separate tasks table).

- **Filled in by:** Jesse, by hand or in NocoDB.
- **Privacy:** Free text: the biggest leak risk in a spreadsheet tool. No health details, children's names or passport numbers. Erasing a family erases its log.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | Database |  | Primary key. |
| `family_id` | uuid | yes |  | Jesse |  | Family it concerns. Erasing a family erases its log. |
| `vendor_id` | uuid | yes |  | Jesse |  | Vendor it concerns. |
| `departure_id` | uuid | yes |  | Jesse |  | Departure it concerns (only empty planning departures can be deleted, so this rarely fires). |
| `kind` | interaction_kind | no | `'note'` | Jesse |  | email, call, video, meeting, message (WhatsApp/SMS), note (internal, or a pure to-do). |
| `occurred_at` | timestamp with time zone | no | `now()` | Jesse |  | When it happened. |
| `summary` | text | no |  | Jesse | Free text | What was said or decided, a sentence or two, not a transcript. No health details, children's names or passport numbers; for those, record only that they were sent, e.g. 'passport details sent to hotel directly'. |
| `follow_up_on` | date | yes |  | Jesse |  | Date to act again, if any. |
| `follow_up_done_at` | timestamp with time zone | yes |  | Jesse |  | When the follow-up was done. NULL with a follow_up_on date = still open. |
| `created_at` | timestamp with time zone | no | `now()` | Database |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | Database |  | Last change (trigger-maintained). |

Keys and rules:

- CHECK at least one of family_id, vendor_id, departure_id is set
- Partial index on follow_up_on for open follow-ups (follow_up_on set, follow_up_done_at NULL)
- FK `family_id` → `families.id` ON DELETE CASCADE
- FK `vendor_id` → `vendors.id` ON DELETE CASCADE
- FK `departure_id` → `departures.id` ON DELETE CASCADE

## Existing app-owned tables

These are written by the website and the Stripe webhook. In NocoDB give the database role read-only access to them, so a spreadsheet edit cannot desync app state (see the NocoDB runbook). They carry comments (migration 0003) but are otherwise unchanged.

### `signups`

Early-access requests from the website (stage 1). One row per email address. App-owned: written by the signup and enrich forms; treat as read-only in a spreadsheet tool. Also the marketing-consent record: a family promoted from here keeps this row.

- **Filled in by:** The website (signup and enrich forms).
- **Privacy:** Email and optional first name, children's count and age bands (never names), destinations. Hashed IP only. Deleted on request within 30 days, or once the 2027 journeys are over.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | App |  | Primary key. |
| `email` | text | no |  | App |  | Email as typed, trimmed. |
| `email_key` | text | no |  | App |  | Lowercased and trimmed email; the dedupe key (unique). |
| `name` | text | yes |  | App |  | First name, optional. |
| `children_count` | integer | yes |  | App |  | Number of children, optional. |
| `children_ages` | text | yes |  | App |  | Children's ages or bands as the parent typed them (free text, up to 120 characters), never names. The privacy page promises bands only. |
| `destinations` | text[] | yes |  | App |  | Destinations of interest (array of journey slugs). |
| `notes` | text | yes |  | App |  | Free-text note from the enrich form. Do not copy into other tables without checking for health details. |
| `source` | text | yes |  | App |  | Short slug for where on the site the signup came from (e.g. 'hero'). |
| `referrer` | text | yes |  | App |  | HTTP referrer at signup, if any. |
| `utm` | jsonb | yes |  | App |  | UTM parameters at signup (json). |
| `landing_path` | text | yes |  | App |  | Page path the visitor landed on. |
| `status` | signup_status | no | `'pending'` | App |  | pending (not confirmed), confirmed, unsubscribed. |
| `confirm_token` | text | no |  | App |  | SECRET capability token that unlocks the enrich form. Never expose or share this column. |
| `consent_at` | timestamp with time zone | no | `now()` | App |  | When the privacy consent was given. |
| `consent_version` | text | no |  | App |  | Version of the privacy notice consented to. |
| `confirmed_at` | timestamp with time zone | yes |  | App |  | When the email address was confirmed. |
| `ip_hash` | text | yes |  | App |  | Hash of the IP address at signup. The raw IP is never stored. |
| `user_agent` | text | yes |  | App |  | Browser user agent at signup. |
| `created_at` | timestamp with time zone | no | `now()` | App |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | App |  | Last change (set by the app). |

### `reservations`

Refundable deposit holds taken through Stripe Checkout (stage 2). App-owned and written by the checkout route and the Stripe webhook; treat as read-only in a spreadsheet tool. A paid reservation is linked to a booking through payments.reservation_id.

- **Filled in by:** The website and the Stripe webhook.
- **Privacy:** Email and Stripe ids; no card data.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | App |  | Primary key. |
| `signup_id` | uuid | yes |  | App |  | The signup this deposit came from, if any. SET NULL on signup deletion. |
| `email` | text | no |  | App |  | Email as typed at checkout. |
| `email_key` | text | no |  | App |  | Lowercased and trimmed email. |
| `journey` | journey | no |  | App |  | Which journey the deposit holds a place on. |
| `amount_cents` | integer | no |  | App |  | Deposit amount in minor units. |
| `currency` | text | no | `'usd'` | App |  | Lowercase ISO 4217. |
| `status` | reservation_status | no | `'pending'` | App |  | pending, paid, refunded, expired, cancelled. |
| `stripe_checkout_session_id` | text | yes |  | App |  | Stripe Checkout Session id (cs_...), unique. |
| `stripe_payment_intent_id` | text | yes |  | App |  | Stripe PaymentIntent id (pi_...). |
| `stripe_customer_id` | text | yes |  | App |  | Stripe Customer id (cus_...), when Checkout created one. |
| `hold_expires_at` | timestamp with time zone | yes |  | App |  | End of the free-hold window. |
| `paid_at` | timestamp with time zone | yes |  | App |  | When the payment cleared. |
| `refunded_at` | timestamp with time zone | yes |  | App |  | When the deposit was refunded. |
| `created_at` | timestamp with time zone | no | `now()` | App |  | Row creation time. |
| `updated_at` | timestamp with time zone | no | `now()` | App |  | Last change (set by the app). |

Keys: FK `signup_id` → `signups.id` ON DELETE SET NULL.

### `stripe_events`

Stripe event ids already handled; the webhook's idempotency gate. App-owned; never edit.

- **Filled in by:** The Stripe webhook.
- **Privacy:** No personal data.

| Column | Type | Null | Default | Filled by | Privacy | Notes |
|---|---|---|---|---|---|---|
| `id` | text | no |  | App |  | Stripe event id (evt_...). |
| `type` | text | no |  | App |  | Stripe event type, e.g. checkout.session.completed. |
| `received_at` | timestamp with time zone | no | `now()` | App |  | When the event was first handled. |

## Privacy and retention

### Where sensitive data may live

1. Children's names, anyone's date of birth, dietary needs, allergies and medical notes exist only in `travellers`. Nothing else has a column for them, and every notes column says so.
2. `travellers_sensitive_gate_check` keeps those columns NULL unless the row carries `sensitive_consent_version`, `sensitive_consent_at` and `sensitive_purge_after`. It is a row-local CHECK, so it binds NocoDB edits too and no schema change is needed when the booking stage opens. Residual risk: someone typing a consent version by hand before the notice exists. Don't. Only the booking form should set it, from the published notice version.
3. Children's email and phone are blocked outright (`travellers_child_contact_check`).
4. Passports and government IDs are never stored, anywhere. Vendors that need them collect them directly; `interactions` records only that they were sent.
5. `documents` holds links, never files, and never a medical form or passport scan. For a background check store only the link, status and expiry, not its content.

### What must wait for a privacy-page update

The privacy page today promises: children's ages as bands only, never names, only when a parent chooses; hashed IP only; and "nothing else". It does not mention Stripe.

- **Before `DEPOSITS_ENABLED` goes on and before the first booking row:** add Stripe as the payment processor; booking-stage data (last names, phone, home city, arrival and departure details); sharing names, arrival times and tier headcounts with named supplier categories (hotels, transfer drivers, hosts, guides) in Spain and Guatemala; the host of NocoDB if it is not Railway; and the 7-year retention of booking and payment records. Families promoted from signups (email, first name, age bands as labelled `travellers` rows with no names) are fine under today's notice.
- **Before any sensitive traveller column is filled:** a children's and health section with explicit parental consent at booking, stating what is collected (names, dietary, allergies, minimal medical notes, date of birth only if a supplier requires it), why, who receives it (hosts, restaurants, accommodation), and that it is deleted 90 days after the trip. Build the purge job with the consent form, before the first such row exists.
- **Suppliers:** a vendor and contractor notice, or a clause in their agreements, covering individual hosts' and guides' data and background checks.
- **Existing gap, outside this schema:** the enrich form's notes placeholder invites "a dietary need", which pulls health data into `signups.notes` against the "nothing else" promise. Remove that phrase or cover it in the privacy update.

### Retention

- **Leads** (families with no booking), their travellers and interactions: deleted on request within 30 days, or once the 2027 journeys are over (today's promise).
- **Sensitive traveller columns and a child's names:** set to NULL on `sensitive_purge_after` (departure `ends_on` + 90 days) by a scheduled job, to be built with the consent flow. `travellers_purge_idx` supports it.
- **Bookings, payments and their documents:** kept 7 years for US tax and accounting. On an erasure request for a booked family a delete is blocked by RESTRICT on purpose. Instead anonymise with the snippet in [Erasure runbook](#erasure-runbook-a-family) below, which in one transaction: keeps `bookings` rows (ref, dates, prices, status, consent versions) and the Stripe ids; clears every personal field on `families`, `travellers`, `bookings`, `reservations` and booking `documents`; deletes the family's `interactions` and its source `signups` row. A family with no booking is simply deleted (cascades to travellers and interactions).
- **Individual vendors and vendor contacts:** deleted 2 years after their last service line, keeping only the name on rows tied to 7-year cost records. Background-check documents are removed when the host stops working with Avelune.

### Access

If NocoDB is used it sits behind its own login with only Jesse's account, using the hand-created database role below. Jesse is the operator who briefs hosts, so he sees the sensitive columns. If anyone else ever gets admin access, put the sensitive columns behind a view or a separate table first.

## Erasure runbook (a family)

Run as the database owner (the `nocodb` role cannot update `reservations` or `signups`). Replace the uuid on the first line with `families.id`, then run the whole block. It is one transaction, so it either does everything or nothing. It runs by hand on request; the 30-day clock for leads and the 7-year clock for booked families are in Retention above.

```sql
BEGIN;
DO $erase$
DECLARE
  fam   uuid := '00000000-0000-0000-0000-000000000000';  -- families.id to erase
  sid   uuid;
  ekey  text;
BEGIN
  SELECT signup_id, email_key INTO sid, ekey FROM families WHERE id = fam;
  IF NOT FOUND THEN RAISE EXCEPTION 'no such family'; END IF;

  -- A deposit is a payment record even for a lead: keep amounts and Stripe ids, drop the address.
  UPDATE reservations SET email = 'erased+' || id || '@invalid',
         email_key = 'erased+' || id || '@invalid', signup_id = NULL
   WHERE signup_id = sid OR email_key = ekey;

  IF NOT EXISTS (SELECT 1 FROM bookings WHERE family_id = fam) THEN
    -- Lead only: delete outright. travellers and interactions cascade.
    DELETE FROM families WHERE id = fam;
  ELSE
    -- Booked family: keep the money and the booking facts, remove the person.
    UPDATE bookings SET arrival_details = NULL, departure_details = NULL,
           arrives_at = NULL, departs_at = NULL, notes = NULL, cancellation_reason = NULL
     WHERE family_id = fam;

    UPDATE documents SET notes = NULL
     WHERE booking_id IN (SELECT id FROM bookings WHERE family_id = fam);

    -- Adults and children alike. 'Traveller N' replaces labels like 'Parent: Jesse'.
    UPDATE travellers t SET
           label = 'Traveller ' || n.rn || ' (' || t.age_band || ')',
           relationship = NULL, first_name = NULL, last_name = NULL, email = NULL, phone = NULL,
           date_of_birth = NULL, dietary = NULL, allergies = NULL, medical_notes = NULL
      FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
              FROM travellers WHERE family_id = fam) n
     WHERE t.id = n.id;

    DELETE FROM interactions WHERE family_id = fam;

    UPDATE families SET family_name = 'Erased family',
           email = 'erased+' || id || '@invalid', primary_contact_name = NULL, phone = NULL,
           home_city = NULL, notes = NULL, source = NULL, signup_id = NULL
     WHERE id = fam;
  END IF;

  -- The early-access row holds the same person's email, name, children's bands and notes.
  IF sid IS NOT NULL THEN DELETE FROM signups WHERE id = sid; END IF;
END
$erase$;
COMMIT;
```

What stays on purpose: `families.stripe_customer_id`, `reservations`/`payments` Stripe ids and amounts, `bookings.ref`, status, price, dates and consent versions, and `booking_travellers` age tiers (headcount history, no names). Stripe holds its own copy of the customer's name and email: delete or redact the customer in the Stripe dashboard too, once the 7-year records no longer need it. Any signup that shares only the email but was never linked (`signup_id` empty) is matched by `email_key` for reservations; check `signups` for it by hand: `SELECT id FROM signups WHERE email_key = '<key>'`.

## NocoDB runbook (manual, not a migration)

The role is created by hand because its password must not land in git and migrations run at container start. Run once as the database owner, choosing a strong password and keeping it in the NocoDB environment only:

```sql
CREATE ROLE nocodb LOGIN PASSWORD '<generate one; do not commit>';
GRANT USAGE ON SCHEMA public TO nocodb;

-- Read-write on the operating model.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  departures, families, travellers, bookings, booking_travellers, payments,
  vendors, vendor_contacts, departure_services, documents, interactions
  TO nocodb;
GRANT USAGE ON SEQUENCE booking_ref_seq TO nocodb;

-- App- and webhook-owned state: read only, so a spreadsheet edit cannot desync it.
GRANT SELECT ON reservations, stripe_events TO nocodb;
-- signups: read only, without the secret token or the network fingerprints.
GRANT SELECT (id, email, email_key, name, children_count, children_ages, destinations,
  notes, source, referrer, utm, landing_path, status, consent_at, consent_version,
  confirmed_at, created_at, updated_at) ON signups TO nocodb;
```

Notes: generated columns (`families.email_key`, `departure_services.total_cents`) and `bookings.ref` and the timestamps are filled by the database; mark them read-only in NocoDB. Run NocoDB's own metadata in a separate database or schema, not in this one. The grant above hides `signups.confirm_token` (a secret), `ip_hash` and `user_agent` from the spreadsheet. Column-level privileges can trip tools that run SELECT *; if NocoDB complains about signups, expose it through a view that omits those columns and grant that instead.

## Useful derived questions

Each of these is one query; add database views once real rows exist.

```sql
-- Headcount per age tier for a departure (sets how many hosts each tier needs)
SELECT bt.age_band, count(*) FROM booking_travellers bt
JOIN bookings b ON b.id = bt.booking_id
JOIN departures d ON d.id = b.departure_id
WHERE d.code = 'SSB-2027-07' AND b.status IN ('held','confirmed')
GROUP BY bt.age_band;

-- Families committed vs minimum, and whether it is guaranteed
SELECT d.code, count(b.id) FILTER (WHERE b.status = 'confirmed') AS confirmed,
       d.min_families, d.max_families, d.guaranteed_at
FROM departures d LEFT JOIN bookings b ON b.departure_id = d.id GROUP BY d.id;

-- Overdue family payments
SELECT b.ref, p.kind, p.due_on, p.amount_cents - p.amount_refunded_cents AS net
FROM payments p JOIN bookings b ON b.id = p.booking_id
WHERE p.status IN ('scheduled','invoiced') AND p.due_on < current_date;

-- Balance still owed on a booking
SELECT b.ref, b.total_price_cents - coalesce(sum(p.amount_cents - p.amount_refunded_cents)
       FILTER (WHERE p.status IN ('paid','refunded')), 0) AS balance_cents
FROM bookings b LEFT JOIN payments p ON p.booking_id = b.id GROUP BY b.id;

-- Documents that lapse before a departure ends (insurance, background checks).
-- A document reaches a departure by any of three routes: filed on the departure,
-- on one of its service lines, or on a vendor that has a held or confirmed line on it.
SELECT DISTINCT d.code, doc.title, doc.kind, doc.expires_on, v.name AS vendor
FROM documents doc
JOIN departures d ON d.ends_on > doc.expires_on AND (
     d.id = doc.departure_id
  OR EXISTS (SELECT 1 FROM departure_services ds
              WHERE ds.id = doc.departure_service_id AND ds.departure_id = d.id)
  OR EXISTS (SELECT 1 FROM departure_services ds
              WHERE ds.vendor_id = doc.vendor_id AND ds.departure_id = d.id
                AND ds.status IN ('held','confirmed'))
)
LEFT JOIN vendors v ON v.id = doc.vendor_id
WHERE doc.expires_on IS NOT NULL AND doc.status <> 'void'
  AND d.status NOT IN ('cancelled','completed')
ORDER BY doc.expires_on;

-- Vendor payables due in the next 30 days (in the vendor's currency)
SELECT v.name, ds.title, ds.currency, ds.total_cents - ds.paid_cents AS owed_cents, ds.balance_due_on
FROM departure_services ds JOIN vendors v ON v.id = ds.vendor_id
WHERE ds.status IN ('held','confirmed') AND ds.balance_due_on <= current_date + 30;

-- Open follow-ups (Jesse's to-do list)
SELECT follow_up_on, kind, summary FROM interactions
WHERE follow_up_on IS NOT NULL AND follow_up_done_at IS NULL ORDER BY follow_up_on;
```

## Wiring notes for the Stripe work

- Set `customer_creation: 'always'` on the deposit Checkout Session so `reservations.stripe_customer_id` is populated; copy it to `families.stripe_customer_id` so deposit, instalment invoices and refunds sit on one Stripe customer.
- Payment links: the webhook and the `/pay` return page both record a completed Checkout Session against the `payments` row (matched by the `payment_id` in the session metadata), idempotently, and a refund is matched by `stripe_payment_intent_id`. Invoices (`stripe_invoice_id`) are still not wired.

## Deliberately not modelled yet

- A `trips` table (the `journey` enum does the job for two destinations; a new destination is an additive `ALTER TYPE journey ADD VALUE`) and a `tasks` table (open `interactions` follow-ups are the to-do list).
- Emergency contacts, passports and government IDs (never stored; parents travel with their children in 2027), party-size counts on bookings (they would duplicate `booking_travellers`), per-person list prices and per-departure deposit amounts (pricing is unsettled; `price_note` and `bookings.total_price_cents` suffice), vendor tax ids and legal names.
- A vendor payments ledger and an FX table (`departure_services.paid_cents` and a hand-set `usd_estimate_cents` cover two departures), rooming and a day-by-day itinerary (the customer-facing itinerary stays in `src/content/site.ts` until the family portal).
- Portal accounts and logins, staff roles, an audit log, referral tracking, post-trip feedback, tags, and a traveller-care split into its own table with a role that cannot read it (do that if anyone besides Jesse gets admin access).
- Sync code: Stripe webhook → `payments`, signup → family promotion, the booking form, and the sensitive-data purge job. The schema supports all of them.
