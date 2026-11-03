ALTER TABLE "documents" DROP CONSTRAINT "documents_departure_service_id_departure_services_id_fk";
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_departure_service_id_departure_services_id_fk" FOREIGN KEY ("departure_service_id") REFERENCES "public"."departure_services"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookings_family_id_idx" ON "bookings" USING btree ("family_id");