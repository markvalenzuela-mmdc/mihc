CREATE TABLE "profile_additional_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"how_did_you_find_out" text,
	"coursera_invite_sent" boolean DEFAULT false NOT NULL,
	"has_app_form_edits" boolean DEFAULT false NOT NULL,
	"coursera_invite_sent_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_additional_info_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "profile_disclosures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"data_privacy_1" boolean DEFAULT false NOT NULL,
	"marketing_notif_consent" boolean DEFAULT false NOT NULL,
	"data_privacy_2" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_disclosures_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "profile_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"applicant_personal_id_gdrive_link" text,
	"proof_of_hs_completion_gdrive_link" text,
	"applicant_personal_id_submitted_date" date,
	"proof_of_hs_completion_submitted_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_documents_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "profile_learner_readiness" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"assistance_need_score" integer,
	"computer_device_access" text,
	"online_learning_platforms" text,
	"software_skills" text,
	"online_platforms_specified" text,
	"internet_connectivity" text,
	"time_commitment" text,
	"time_management_effectiveness" text,
	"self_discipline_confidence" text,
	"learning_goal" text,
	"challenges_provided" text,
	"potential_challenges" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_learner_readiness_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "profile_payment_details" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"program_fee" text,
	"need_official_receipt" boolean DEFAULT false NOT NULL,
	"promo_code" text,
	"tin_number" text,
	"discounted_fee" text,
	"business_name" text,
	"payment_method" text,
	"business_tin_number" text,
	"proof_of_payment" text,
	"business_address" text,
	"is_renewal_payment" boolean DEFAULT false NOT NULL,
	"business_bir_2303_gdrive_link" text,
	"proof_of_payment_gdrive_link" text,
	"business_bir_2303_submitted_date" date,
	"proof_of_payment_submitted_date" date,
	"proof_of_payment_aa_remarks" text,
	"timestamp_in_payment_verification" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_payment_details_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "profile_study_buddy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"sb_nominator" text,
	"sb_nominee_name" text,
	"sb_promo_code" text,
	"sb_nominee_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_study_buddy_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "profile_system_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"is_sent_to_api" boolean DEFAULT false NOT NULL,
	"last_sent_to_api" timestamp with time zone,
	"is_api_error" boolean DEFAULT false NOT NULL,
	"api_error_message" text,
	"change_record_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_system_info_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "status" SET DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "middle_name" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "suffix" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "landline" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "work_type" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "company_org_name" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "certification_field" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "is_leap_pad_re_enrollment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "is_self_enrolled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "current_foreign_address" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "lost_date" date;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "lost_reason" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "lost_reason_specific" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "lost_reason_remark" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "profile_locked_date" date;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "subscription_expiration_date" date;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "middle_name" text;--> statement-breakpoint
ALTER TABLE "profile_additional_info" ADD CONSTRAINT "profile_additional_info_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_disclosures" ADD CONSTRAINT "profile_disclosures_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_payment_details" ADD CONSTRAINT "profile_payment_details_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_study_buddy" ADD CONSTRAINT "profile_study_buddy_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_system_info" ADD CONSTRAINT "profile_system_info_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;