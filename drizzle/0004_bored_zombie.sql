ALTER TABLE "care_recipients" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "care_recipients" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "care_recipients" ADD COLUMN "deleted_at" timestamp with time zone;