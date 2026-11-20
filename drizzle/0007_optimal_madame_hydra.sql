CREATE TABLE "care_recipient_change_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"proposed_data" text NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"reviewed_by_id" uuid,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "care_recipient_change_requests" ADD CONSTRAINT "care_recipient_change_requests_recipient_id_care_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."care_recipients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_recipient_change_requests" ADD CONSTRAINT "care_recipient_change_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_recipient_change_requests" ADD CONSTRAINT "care_recipient_change_requests_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_recipient_change_requests" ADD CONSTRAINT "care_recipient_change_requests_reviewed_by_id_users_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_recipient_change_requests_recipient_idx" ON "care_recipient_change_requests" USING btree ("recipient_id","status");--> statement-breakpoint
CREATE INDEX "care_recipient_change_requests_org_idx" ON "care_recipient_change_requests" USING btree ("organization_id","status");