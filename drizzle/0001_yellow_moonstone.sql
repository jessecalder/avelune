CREATE TYPE "public"."journey" AS ENUM('san-sebastian', 'antigua');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'paid', 'refunded', 'expired', 'cancelled');--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signup_id" uuid,
	"email" text NOT NULL,
	"email_key" text NOT NULL,
	"journey" "journey" NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" "reservation_status" DEFAULT 'pending' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"stripe_customer_id" text,
	"hold_expires_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_signup_id_signups_id_fk" FOREIGN KEY ("signup_id") REFERENCES "public"."signups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_checkout_session_idx" ON "reservations" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "reservations_email_key_idx" ON "reservations" USING btree ("email_key");