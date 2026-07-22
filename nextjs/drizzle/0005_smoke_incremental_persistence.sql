ALTER TABLE "smoke_runs" ADD COLUMN "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "smoke_runs_test_results" ADD COLUMN "started_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "smoke_runs_test_results" ADD COLUMN "completed_at" timestamp with time zone;