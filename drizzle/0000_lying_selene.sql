CREATE TYPE "public"."signup_status" AS ENUM('pending', 'confirmed', 'unsubscribed');--> statement-breakpoint
CREATE TABLE "signups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_key" text NOT NULL,
	"name" text,
	"children_count" integer,
	"children_ages" text,
	"destinations" text[],
	"notes" text,
	"source" text,
	"referrer" text,
	"utm" jsonb,
	"landing_path" text,
	"status" "signup_status" DEFAULT 'pending' NOT NULL,
	"confirm_token" text NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consent_version" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "signups_email_key_idx" ON "signups" USING btree ("email_key");--> statement-breakpoint
CREATE UNIQUE INDEX "signups_confirm_token_idx" ON "signups" USING btree ("confirm_token");