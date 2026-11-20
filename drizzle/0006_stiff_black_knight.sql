ALTER TABLE "memberships" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN "deactivated_at" timestamp with time zone;