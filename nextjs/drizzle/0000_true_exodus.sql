CREATE TABLE "apps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smoke_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_number" integer NOT NULL,
	"app_id" text NOT NULL,
	"status" text NOT NULL,
	"trigger" text NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"passed" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"duration_seconds" integer,
	"started_by" uuid,
	"checked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "smoke_runs_app_id_run_number_unique" UNIQUE("app_id","run_number")
);
--> statement-breakpoint
CREATE TABLE "smoke_runs_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"test_name" text NOT NULL,
	"test_file" text,
	"status" text NOT NULL,
	"duration_ms" integer,
	"error_message" text,
	"error_stack" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"account_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "e2e_run_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"step_id" text NOT NULL,
	"status" text NOT NULL,
	"duration_seconds" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "e2e_run_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_step_id" uuid NOT NULL,
	"test_name" text NOT NULL,
	"status" text NOT NULL,
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "e2e_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_number" integer NOT NULL,
	"profile_id" uuid NOT NULL,
	"status" text NOT NULL,
	"started_by" uuid,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "e2e_runs_profile_id_run_number_unique" UNIQUE("profile_id","run_number")
);
--> statement-breakpoint
CREATE TABLE "e2e_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profile_enrollment_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"given_name" text,
	"family_name" text,
	"birthplace" text,
	"birthdate" date,
	"gender" text,
	"nationality" text,
	"civil_status" text,
	"monthly_income" text,
	"mobile" text,
	"preferred_learning_hub" text,
	"student_type" text,
	"sub_student_type" text,
	"student_status" text,
	"religion" text,
	"strand" text,
	"last_school_attended" text,
	"term_applied" text,
	"program_focus" text,
	"program_applied" text,
	"current_address_country" text,
	"current_address_line1" text,
	"current_address_line2" text,
	"current_address_province" text,
	"current_address_city" text,
	"current_address_barangay" text,
	"current_address_zip_code" text,
	"permanent_address_country" text,
	"permanent_address_line1" text,
	"permanent_address_line2" text,
	"permanent_address_province" text,
	"permanent_address_city" text,
	"permanent_address_barangay" text,
	"permanent_address_zip_code" text,
	"interested_in_scholarship" text,
	"with_medical_condition" text,
	"father_status" text,
	"mother_status" text,
	"guardian_type" text,
	"guardian_given_name" text,
	"guardian_family_name" text,
	"guardian_suffix" text,
	"guardian_birthdate" date,
	"guardian_mobile" text,
	"guardian_email" text,
	"guardian_occupation" text,
	"guardian_relationship" text,
	"copy_guardian_address" boolean DEFAULT false,
	"copy_permanent_guardian_address" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_enrollment_data_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"program" text NOT NULL,
	"cohort" text NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smoke_runs" ADD CONSTRAINT "smoke_runs_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smoke_runs" ADD CONSTRAINT "smoke_runs_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smoke_runs_test_results" ADD CONSTRAINT "smoke_runs_test_results_run_id_smoke_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."smoke_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e2e_run_steps" ADD CONSTRAINT "e2e_run_steps_run_id_e2e_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."e2e_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e2e_run_steps" ADD CONSTRAINT "e2e_run_steps_step_id_e2e_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."e2e_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e2e_run_tests" ADD CONSTRAINT "e2e_run_tests_run_step_id_e2e_run_steps_id_fk" FOREIGN KEY ("run_step_id") REFERENCES "public"."e2e_run_steps"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e2e_runs" ADD CONSTRAINT "e2e_runs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e2e_runs" ADD CONSTRAINT "e2e_runs_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_smoke_runs_app_run" ON "smoke_runs" USING btree ("app_id","run_number" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_smoke_results_run_id" ON "smoke_runs_test_results" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_e2e_run_steps_run_id" ON "e2e_run_steps" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_e2e_run_tests_step_id" ON "e2e_run_tests" USING btree ("run_step_id");