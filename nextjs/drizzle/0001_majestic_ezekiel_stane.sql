ALTER TABLE "profiles" ADD COLUMN "flow_type" text NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "program";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "cohort";