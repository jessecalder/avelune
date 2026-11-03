CREATE TYPE "public"."age_band" AS ENUM('under_3', 'age_3_5', 'age_6_9', 'age_10_13', 'age_14_17', 'adult');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('waitlisted', 'held', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."departure_status" AS ENUM('planning', 'open', 'closed', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('contract', 'quote', 'invoice', 'insurance', 'licence', 'background_check', 'waiver', 'terms', 'other');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('requested', 'draft', 'sent', 'on_file', 'void');--> statement-breakpoint
CREATE TYPE "public"."family_status" AS ENUM('lead', 'in_conversation', 'booked', 'travelled', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."interaction_kind" AS ENUM('email', 'call', 'video', 'meeting', 'message', 'note');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('deposit', 'instalment', 'balance', 'extra');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('stripe', 'bank_transfer', 'check', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('scheduled', 'invoiced', 'paid', 'refunded', 'waived', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."rate_unit" AS ENUM('flat', 'per_person', 'per_family', 'per_night', 'per_room_night', 'per_hour', 'per_day');--> statement-breakpoint
CREATE TYPE "public"."service_status" AS ENUM('needed', 'requested', 'quoted', 'held', 'confirmed', 'declined', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."vendor_category" AS ENUM('accommodation', 'host', 'guide', 'transport', 'restaurant', 'activity', 'other');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('prospect', 'contacted', 'approved', 'contracted', 'declined', 'inactive');--> statement-breakpoint
CREATE SEQUENCE "public"."booking_ref_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "booking_travellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"traveller_id" uuid NOT NULL,
	"age_band" "age_band" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text DEFAULT ('AV-' || lpad(nextval('booking_ref_seq')::text, 4, '0')) NOT NULL,
	"family_id" uuid NOT NULL,
	"departure_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'held' NOT NULL,
	"total_price_cents" integer,
	"currency" text DEFAULT 'usd' NOT NULL,
	"held_until" timestamp with time zone,
	"terms_version" text,
	"terms_accepted_at" timestamp with time zone,
	"privacy_version" text,
	"privacy_accepted_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"arrives_at" timestamp with time zone,
	"arrival_details" text,
	"departs_at" timestamp with time zone,
	"departure_details" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_price_check" CHECK (total_price_cents IS NULL OR total_price_cents >= 0),
	CONSTRAINT "bookings_currency_check" CHECK (currency ~ '^[a-z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "departure_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"departure_id" uuid NOT NULL,
	"vendor_id" uuid,
	"category" "vendor_category" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"age_band" "age_band",
	"starts_on" date,
	"ends_on" date,
	"start_time" time,
	"status" "service_status" DEFAULT 'needed' NOT NULL,
	"rate_unit" "rate_unit" DEFAULT 'flat' NOT NULL,
	"unit_rate_cents" integer,
	"quantity" numeric(10, 2) DEFAULT '1' NOT NULL,
	"currency" text NOT NULL,
	"total_cents" integer GENERATED ALWAYS AS (round(unit_rate_cents * quantity)::integer) STORED,
	"usd_estimate_cents" integer,
	"quote_valid_until" date,
	"confirmation_ref" text,
	"deposit_due_on" date,
	"balance_due_on" date,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"cancellation_terms" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departure_services_vendor_check" CHECK (vendor_id IS NOT NULL OR status IN ('needed', 'cancelled')),
	CONSTRAINT "departure_services_dates_check" CHECK (starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on),
	CONSTRAINT "departure_services_amounts_check" CHECK ((unit_rate_cents IS NULL OR unit_rate_cents >= 0) AND quantity > 0 AND paid_cents >= 0),
	CONSTRAINT "departure_services_currency_check" CHECK (currency ~ '^[a-z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "departures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"journey" "journey" NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"status" "departure_status" DEFAULT 'planning' NOT NULL,
	"min_families" smallint DEFAULT 6 NOT NULL,
	"max_families" smallint DEFAULT 10 NOT NULL,
	"guaranteed_at" timestamp with time zone,
	"currency" text DEFAULT 'usd' NOT NULL,
	"balance_due_on" date,
	"price_note" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departures_dates_check" CHECK (ends_on > starts_on),
	CONSTRAINT "departures_capacity_check" CHECK (min_families >= 1 AND max_families >= min_families),
	CONSTRAINT "departures_currency_check" CHECK (currency ~ '^[a-z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" "document_kind" NOT NULL,
	"status" "document_status" DEFAULT 'requested' NOT NULL,
	"url" text,
	"vendor_id" uuid,
	"departure_service_id" uuid,
	"departure_id" uuid,
	"booking_id" uuid,
	"dated_on" date,
	"expires_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "documents_owner_check" CHECK (num_nonnulls(vendor_id, departure_service_id, departure_id, booking_id) >= 1),
	CONSTRAINT "documents_url_check" CHECK (url IS NULL OR url LIKE 'https://%'),
	CONSTRAINT "documents_url_required_check" CHECK (status NOT IN ('sent', 'on_file') OR url IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signup_id" uuid,
	"family_name" text NOT NULL,
	"primary_contact_name" text,
	"email" text NOT NULL,
	"email_key" text GENERATED ALWAYS AS (lower(btrim(email))) STORED NOT NULL,
	"phone" text,
	"home_city" text,
	"country_code" text DEFAULT 'US' NOT NULL,
	"status" "family_status" DEFAULT 'lead' NOT NULL,
	"source" text,
	"stripe_customer_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "families_country_code_check" CHECK (country_code ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid,
	"vendor_id" uuid,
	"departure_id" uuid,
	"kind" "interaction_kind" DEFAULT 'note' NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"summary" text NOT NULL,
	"follow_up_on" date,
	"follow_up_done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interactions_subject_check" CHECK (num_nonnulls(family_id, vendor_id, departure_id) >= 1)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"kind" "payment_kind" NOT NULL,
	"label" text,
	"status" "payment_status" DEFAULT 'scheduled' NOT NULL,
	"method" "payment_method" DEFAULT 'stripe' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"due_on" date NOT NULL,
	"paid_at" timestamp with time zone,
	"amount_refunded_cents" integer DEFAULT 0 NOT NULL,
	"refunded_at" timestamp with time zone,
	"reservation_id" uuid,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_invoice_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amounts_check" CHECK (amount_cents > 0 AND amount_refunded_cents BETWEEN 0 AND amount_cents),
	CONSTRAINT "payments_paid_at_check" CHECK (status NOT IN ('paid', 'refunded') OR paid_at IS NOT NULL),
	CONSTRAINT "payments_refunded_check" CHECK (status <> 'refunded' OR amount_refunded_cents = amount_cents),
	CONSTRAINT "payments_reservation_kind_check" CHECK (reservation_id IS NULL OR kind = 'deposit'),
	CONSTRAINT "payments_currency_check" CHECK (currency ~ '^[a-z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "travellers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"age_band" "age_band" NOT NULL,
	"label" text NOT NULL,
	"relationship" text,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"date_of_birth" date,
	"dietary" text,
	"allergies" text,
	"medical_notes" text,
	"sensitive_consent_version" text,
	"sensitive_consent_at" timestamp with time zone,
	"sensitive_purge_after" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "travellers_child_contact_check" CHECK (age_band = 'adult' OR (email IS NULL AND phone IS NULL)),
	CONSTRAINT "travellers_sensitive_gate_check" CHECK ((sensitive_consent_version IS NOT NULL AND sensitive_consent_at IS NOT NULL AND sensitive_purge_after IS NOT NULL) OR (date_of_birth IS NULL AND dietary IS NULL AND allergies IS NULL AND medical_notes IS NULL AND (age_band = 'adult' OR (first_name IS NULL AND last_name IS NULL))))
);
--> statement-breakpoint
CREATE TABLE "vendor_contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"prefers_whatsapp" boolean DEFAULT false NOT NULL,
	"language" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "vendor_category" NOT NULL,
	"is_individual" boolean DEFAULT false NOT NULL,
	"status" "vendor_status" DEFAULT 'prospect' NOT NULL,
	"journey" "journey",
	"city" text,
	"country_code" text,
	"website" text,
	"email" text,
	"phone" text,
	"default_currency" text,
	"payment_terms" text,
	"rating" smallint,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_rating_check" CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
	CONSTRAINT "vendors_country_code_check" CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
	CONSTRAINT "vendors_currency_check" CHECK (default_currency IS NULL OR default_currency ~ '^[a-z]{3}$')
);
--> statement-breakpoint
ALTER TABLE "booking_travellers" ADD CONSTRAINT "booking_travellers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_travellers" ADD CONSTRAINT "booking_travellers_traveller_id_travellers_id_fk" FOREIGN KEY ("traveller_id") REFERENCES "public"."travellers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_departure_id_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."departures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departure_services" ADD CONSTRAINT "departure_services_departure_id_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."departures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departure_services" ADD CONSTRAINT "departure_services_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_departure_service_id_departure_services_id_fk" FOREIGN KEY ("departure_service_id") REFERENCES "public"."departure_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_departure_id_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."departures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_signup_id_signups_id_fk" FOREIGN KEY ("signup_id") REFERENCES "public"."signups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_departure_id_departures_id_fk" FOREIGN KEY ("departure_id") REFERENCES "public"."departures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travellers" ADD CONSTRAINT "travellers_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_contacts" ADD CONSTRAINT "vendor_contacts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_travellers_booking_traveller_idx" ON "booking_travellers" USING btree ("booking_id","traveller_id");--> statement-breakpoint
CREATE INDEX "booking_travellers_traveller_id_idx" ON "booking_travellers" USING btree ("traveller_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_ref_idx" ON "bookings" USING btree ("ref");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_active_family_departure_idx" ON "bookings" USING btree ("family_id","departure_id") WHERE status <> 'cancelled';--> statement-breakpoint
CREATE INDEX "bookings_departure_status_idx" ON "bookings" USING btree ("departure_id","status");--> statement-breakpoint
CREATE INDEX "departure_services_departure_idx" ON "departure_services" USING btree ("departure_id","starts_on");--> statement-breakpoint
CREATE INDEX "departure_services_vendor_id_idx" ON "departure_services" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "departure_services_status_idx" ON "departure_services" USING btree ("status");--> statement-breakpoint
CREATE INDEX "departure_services_payables_idx" ON "departure_services" USING btree ("balance_due_on") WHERE status IN ('held', 'confirmed');--> statement-breakpoint
CREATE UNIQUE INDEX "departures_code_idx" ON "departures" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "departures_journey_starts_on_idx" ON "departures" USING btree ("journey","starts_on");--> statement-breakpoint
CREATE INDEX "documents_vendor_id_idx" ON "documents" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "documents_departure_service_id_idx" ON "documents" USING btree ("departure_service_id");--> statement-breakpoint
CREATE INDEX "documents_departure_id_idx" ON "documents" USING btree ("departure_id");--> statement-breakpoint
CREATE INDEX "documents_booking_id_idx" ON "documents" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "documents_expires_on_idx" ON "documents" USING btree ("expires_on") WHERE expires_on IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "families_email_key_idx" ON "families" USING btree ("email_key");--> statement-breakpoint
CREATE UNIQUE INDEX "families_signup_id_idx" ON "families" USING btree ("signup_id");--> statement-breakpoint
CREATE UNIQUE INDEX "families_stripe_customer_id_idx" ON "families" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "families_status_idx" ON "families" USING btree ("status");--> statement-breakpoint
CREATE INDEX "interactions_family_idx" ON "interactions" USING btree ("family_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interactions_vendor_idx" ON "interactions" USING btree ("vendor_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interactions_departure_idx" ON "interactions" USING btree ("departure_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "interactions_open_follow_ups_idx" ON "interactions" USING btree ("follow_up_on") WHERE follow_up_on IS NOT NULL AND follow_up_done_at IS NULL;--> statement-breakpoint
CREATE INDEX "payments_booking_id_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_status_due_on_idx" ON "payments" USING btree ("status","due_on");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_reservation_id_idx" ON "payments" USING btree ("reservation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_stripe_payment_intent_idx" ON "payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_stripe_invoice_idx" ON "payments" USING btree ("stripe_invoice_id");--> statement-breakpoint
CREATE INDEX "travellers_family_id_idx" ON "travellers" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "travellers_purge_idx" ON "travellers" USING btree ("sensitive_purge_after") WHERE sensitive_purge_after IS NOT NULL;--> statement-breakpoint
CREATE INDEX "vendor_contacts_vendor_id_idx" ON "vendor_contacts" USING btree ("vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_contacts_primary_idx" ON "vendor_contacts" USING btree ("vendor_id") WHERE is_primary;--> statement-breakpoint
CREATE INDEX "vendors_category_journey_idx" ON "vendors" USING btree ("category","journey");--> statement-breakpoint
CREATE INDEX "vendors_status_idx" ON "vendors" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendors_name_idx" ON "vendors" USING btree ("name");