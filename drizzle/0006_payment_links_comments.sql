-- Comments and the updated_at trigger for payment_links (created in 0005_payment_links).
-- Metadata and a trigger only: no row or column of an existing table changes.
-- Source text: docs/data-model.md.
COMMENT ON TABLE "payment_links" IS 'A private pay-by-link for one payments row: the unguessable token the family opens at /pay/<token>, plus the tracking around it (emailed, opened, at Stripe checkout, bank payment clearing). The payments row stays the money record; paid and refunded come from its status. A payment has at most one live link (cancelled_at NULL); cancelled and replaced links are kept as history. The token is a capability, so treat it like a password: never paste it into a chat or a shared sheet.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."id" IS 'Primary key.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."payment_id" IS 'The payment this link collects. CASCADE: a link is only a way to pay and means nothing without its payment.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."token" IS 'The secret in the link: 32 random bytes, base64url, 43 characters (checked), unique. Anyone holding it can open the payment page, so it is only ever shown to the admin and emailed to the family.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."expires_at" IS 'Optional "link works until". NULL = never expires. After this moment the page says the link is no longer active.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."cancelled_at" IS 'Set when the link is cancelled or replaced by a new one. NULL = live. A partial unique index allows one live link per payment.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."email_sent_at" IS 'Last time the link was emailed to the family, by the app or marked by hand ("I sent it myself").';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."email_sent_to" IS 'Address of that last send.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."email_send_count" IS 'How many times the link has been emailed (sends and hand-marked sends).';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."first_opened_at" IS 'First time someone other than the admin opened the page. Email security scanners that pre-fetch links can set this.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."last_opened_at" IS 'Most recent non-admin view.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."open_count" IS 'Non-admin views of the page.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."checkout_session_id" IS 'Latest Stripe Checkout Session (cs_...) created for this link, unique. Cleared when Stripe reports it expired.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."checkout_started_at" IS 'Latest time the family was sent to Stripe checkout.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."processing_since" IS 'Set when a bank payment (ACH and similar) was submitted and has not cleared yet; cleared when it succeeds or fails. While set the page shows "your payment is on its way".';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."last_failed_at" IS 'Last time a bank payment through this link failed. The link works again afterwards.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."created_at" IS 'Row creation time.';--> statement-breakpoint
COMMENT ON COLUMN "payment_links"."updated_at" IS 'Last change (trigger-maintained).';--> statement-breakpoint
CREATE TRIGGER "payment_links_set_updated_at" BEFORE UPDATE ON "public"."payment_links" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();
