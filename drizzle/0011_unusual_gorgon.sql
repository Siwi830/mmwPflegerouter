CREATE TYPE "public"."OperationKind" AS ENUM('VOLUNTEER_ORG', 'BUSINESS');--> statement-breakpoint
CREATE TYPE "public"."RepresentationStatus" AS ENUM('PENDING', 'ACTIVE', 'REJECTED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."RepresentationType" AS ENUM('CONSENT', 'POWER_OF_ATTORNEY', 'LEGAL_REPRESENTATION');--> statement-breakpoint
CREATE TABLE "care_representations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"representative_user_id" uuid NOT NULL,
	"type" "RepresentationType" NOT NULL,
	"status" "RepresentationStatus" DEFAULT 'PENDING' NOT NULL,
	"can_view" boolean DEFAULT false NOT NULL,
	"can_manage_requests" boolean DEFAULT false NOT NULL,
	"can_manage_appointments" boolean DEFAULT false NOT NULL,
	"can_edit_profile" boolean DEFAULT false NOT NULL,
	"requested_by_id" uuid NOT NULL,
	"approved_by_id" uuid,
	"approved_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"evidence_reference" text,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_operations" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"kind" "OperationKind" NOT NULL,
	"volunteers_enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "care_representations" ADD CONSTRAINT "care_representations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_representations" ADD CONSTRAINT "care_representations_recipient_id_care_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."care_recipients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_representations" ADD CONSTRAINT "care_representations_representative_user_id_users_id_fk" FOREIGN KEY ("representative_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_representations" ADD CONSTRAINT "care_representations_requested_by_id_users_id_fk" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_representations" ADD CONSTRAINT "care_representations_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_operations" ADD CONSTRAINT "organization_operations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_representations_recipient_idx" ON "care_representations" USING btree ("organization_id","recipient_id");--> statement-breakpoint
CREATE INDEX "care_representations_representative_idx" ON "care_representations" USING btree ("representative_user_id","status");