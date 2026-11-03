CREATE TABLE "payment_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"email_sent_at" timestamp with time zone,
	"email_sent_to" text,
	"email_send_count" smallint DEFAULT 0 NOT NULL,
	"first_opened_at" timestamp with time zone,
	"last_opened_at" timestamp with time zone,
	"open_count" integer DEFAULT 0 NOT NULL,
	"checkout_session_id" text,
	"checkout_started_at" timestamp with time zone,
	"processing_since" timestamp with time zone,
	"last_failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_links_token_check" CHECK (token ~ '^[A-Za-z0-9_-]{43}$'),
	CONSTRAINT "payment_links_counts_check" CHECK (open_count >= 0 AND email_send_count >= 0)
);
--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_links_token_idx" ON "payment_links" USING btree ("token");--> statement-breakpoint
CREATE INDEX "payment_links_payment_id_idx" ON "payment_links" USING btree ("payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_links_active_payment_idx" ON "payment_links" USING btree ("payment_id") WHERE cancelled_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_links_checkout_session_idx" ON "payment_links" USING btree ("checkout_session_id");