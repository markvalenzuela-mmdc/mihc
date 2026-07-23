ALTER TABLE "smoke_runs" ADD COLUMN "correlation_id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "smoke_runs" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "smoke_runs_test_results" ADD COLUMN "test_id" text DEFAULT gen_random_uuid()::text NOT NULL;--> statement-breakpoint
ALTER TABLE "smoke_runs_test_results" ADD COLUMN "retry_attempt" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "smoke_runs" ADD CONSTRAINT "smoke_runs_correlation_id_unique" UNIQUE("correlation_id");--> statement-breakpoint
ALTER TABLE "smoke_runs_test_results" ADD CONSTRAINT "smoke_runs_test_results_run_id_test_id_retry_attempt_unique" UNIQUE("run_id","test_id","retry_attempt");