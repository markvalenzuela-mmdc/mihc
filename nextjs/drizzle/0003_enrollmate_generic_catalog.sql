CREATE TABLE "application_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_flow_id" uuid NOT NULL,
	"e2e_run_id" uuid,
	"catalog_version_id" uuid NOT NULL,
	"payload_hash" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrollmate_catalog_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_version" text NOT NULL,
	"reference_date" date NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollmate_catalog_versions_source_version_reference_date_unique" UNIQUE("source_version","reference_date"),
	CONSTRAINT "enrollmate_catalog_versions_id_source_version_unique" UNIQUE("id","source_version")
);
--> statement-breakpoint
CREATE TABLE "enrollmate_option_dependencies" (
	"catalog_version_id" uuid NOT NULL,
	"dependency_type" text NOT NULL,
	"parent_option_id" uuid NOT NULL,
	"child_option_id" uuid NOT NULL,
	CONSTRAINT "enrollmate_option_dependencies_catalog_version_id_dependency_type_parent_option_id_child_option_id_pk" PRIMARY KEY("catalog_version_id","dependency_type","parent_option_id","child_option_id"),
	CONSTRAINT "enrollmate_option_dependencies_type_check" CHECK ("enrollmate_option_dependencies"."dependency_type" in ('major_to_specialization', 'province_to_municipality', 'municipality_to_barangay')),
	CONSTRAINT "enrollmate_option_dependencies_distinct_options_check" CHECK ("enrollmate_option_dependencies"."parent_option_id" <> "enrollmate_option_dependencies"."child_option_id")
);
--> statement-breakpoint
CREATE TABLE "enrollmate_option_sets" (
	"catalog_version_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"is_shared" boolean DEFAULT false NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollmate_option_sets_catalog_version_id_key_pk" PRIMARY KEY("catalog_version_id","key")
);
--> statement-breakpoint
CREATE TABLE "enrollmate_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"catalog_version_id" uuid NOT NULL,
	"option_set_key" text NOT NULL,
	"label" text NOT NULL,
	"submitted_value" text NOT NULL,
	"sort_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollmate_options_catalog_version_id_option_set_key_submitted_value_unique" UNIQUE("catalog_version_id","option_set_key","submitted_value"),
	CONSTRAINT "enrollmate_options_catalog_version_id_option_set_key_id_unique" UNIQUE("catalog_version_id","option_set_key","id"),
	CONSTRAINT "enrollmate_options_catalog_version_id_id_unique" UNIQUE("catalog_version_id","id")
);
--> statement-breakpoint
CREATE TABLE "profile_bachelor_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_flow_id" uuid NOT NULL,
	"catalog_version_id" uuid NOT NULL,
	"flow_type" text DEFAULT 'bachelors' NOT NULL,
	"term_option_set_key" text DEFAULT 'bachelors.termApplied' NOT NULL,
	"term_option_id" uuid,
	"gender_option_set_key" text DEFAULT 'bachelors.gender' NOT NULL,
	"gender_option_id" uuid,
	"civil_status_option_set_key" text DEFAULT 'bachelors.civilStatus' NOT NULL,
	"civil_status_option_id" uuid,
	"monthly_income_option_set_key" text DEFAULT 'bachelors.monthlyIncome' NOT NULL,
	"monthly_income_option_id" uuid,
	"student_status_option_set_key" text DEFAULT 'bachelors.studentStatus' NOT NULL,
	"student_status_option_id" uuid,
	"major_option_set_key" text DEFAULT 'bachelors.programFocus' NOT NULL,
	"major_option_id" uuid,
	"specialization_option_set_key" text DEFAULT 'bachelors.programApplied' NOT NULL,
	"specialization_option_id" uuid,
	"major_specialization_dependency_type" text DEFAULT 'major_to_specialization' NOT NULL,
	"learning_hub_option_set_key" text DEFAULT 'bachelors.prefLearningHub' NOT NULL,
	"learning_hub_option_id" uuid,
	"student_type_option_set_key" text DEFAULT 'bachelors.studentType' NOT NULL,
	"student_type_option_id" uuid,
	"sub_student_type_option_set_key" text DEFAULT 'bachelors.subStudentType' NOT NULL,
	"sub_student_type_option_id" uuid,
	"religion_option_set_key" text DEFAULT 'shared.religion' NOT NULL,
	"religion_option_id" uuid,
	"strand_option_set_key" text DEFAULT 'bachelors.strand' NOT NULL,
	"strand_option_id" uuid,
	"last_school_attended" text,
	"school_not_found" boolean DEFAULT false NOT NULL,
	"last_school_other" text,
	"permanent_address_line_1" text,
	"permanent_address_line_2" text,
	"permanent_address_zip_code" text,
	"permanent_country_option_set_key" text DEFAULT 'shared.country' NOT NULL,
	"permanent_country_option_id" uuid,
	"permanent_province_option_set_key" text DEFAULT 'shared.province' NOT NULL,
	"permanent_province_option_id" uuid,
	"permanent_municipality_option_set_key" text DEFAULT 'shared.municipality' NOT NULL,
	"permanent_municipality_option_id" uuid,
	"permanent_barangay_option_set_key" text DEFAULT 'shared.barangay' NOT NULL,
	"permanent_barangay_option_id" uuid,
	"province_municipality_dependency_type" text DEFAULT 'province_to_municipality' NOT NULL,
	"municipality_barangay_dependency_type" text DEFAULT 'municipality_to_barangay' NOT NULL,
	"scholarship_interest_option_set_key" text DEFAULT 'bachelors.interestedForAScholarship' NOT NULL,
	"scholarship_interest_option_id" uuid,
	"scholarship_option_set_key" text DEFAULT 'bachelors.scholarship' NOT NULL,
	"scholarship_option_id" uuid,
	"medical_condition_option_set_key" text DEFAULT 'bachelors.withMedicalCondition' NOT NULL,
	"medical_condition_option_id" uuid,
	"guardian_assignment_option_set_key" text DEFAULT 'bachelors.guardian' NOT NULL,
	"guardian_assignment_option_id" uuid,
	"referrer_given_name" text,
	"referrer_family_name" text,
	"referrer_email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_bachelor_data_profile_flow_id_unique" UNIQUE("profile_flow_id"),
	CONSTRAINT "profile_bachelor_data_id_catalog_version_id_unique" UNIQUE("id","catalog_version_id"),
	CONSTRAINT "profile_bachelor_data_option_sets_check" CHECK ("profile_bachelor_data"."term_option_set_key" = 'bachelors.termApplied'
        and "profile_bachelor_data"."gender_option_set_key" = 'bachelors.gender'
        and "profile_bachelor_data"."civil_status_option_set_key" = 'bachelors.civilStatus'
        and "profile_bachelor_data"."monthly_income_option_set_key" = 'bachelors.monthlyIncome'
        and "profile_bachelor_data"."student_status_option_set_key" = 'bachelors.studentStatus'
        and "profile_bachelor_data"."major_option_set_key" = 'bachelors.programFocus'
        and "profile_bachelor_data"."specialization_option_set_key" = 'bachelors.programApplied'
        and "profile_bachelor_data"."learning_hub_option_set_key" = 'bachelors.prefLearningHub'
        and "profile_bachelor_data"."student_type_option_set_key" = 'bachelors.studentType'
        and "profile_bachelor_data"."sub_student_type_option_set_key" = 'bachelors.subStudentType'
        and "profile_bachelor_data"."religion_option_set_key" = 'shared.religion'
        and "profile_bachelor_data"."strand_option_set_key" = 'bachelors.strand'
        and "profile_bachelor_data"."permanent_country_option_set_key" = 'shared.country'
        and "profile_bachelor_data"."permanent_province_option_set_key" = 'shared.province'
        and "profile_bachelor_data"."permanent_municipality_option_set_key" = 'shared.municipality'
        and "profile_bachelor_data"."permanent_barangay_option_set_key" = 'shared.barangay'
        and "profile_bachelor_data"."scholarship_interest_option_set_key" = 'bachelors.interestedForAScholarship'
        and "profile_bachelor_data"."scholarship_option_set_key" = 'bachelors.scholarship'
        and "profile_bachelor_data"."medical_condition_option_set_key" = 'bachelors.withMedicalCondition'
        and "profile_bachelor_data"."guardian_assignment_option_set_key" = 'bachelors.guardian'),
	CONSTRAINT "profile_bachelor_data_flow_type_check" CHECK ("profile_bachelor_data"."flow_type" = 'bachelors')
);
--> statement-breakpoint
CREATE TABLE "profile_discovery_channels" (
	"profile_flow_id" uuid NOT NULL,
	"catalog_version_id" uuid NOT NULL,
	"option_set_key" text DEFAULT 'shared.discoveryChannels' NOT NULL,
	"option_id" uuid NOT NULL,
	CONSTRAINT "profile_discovery_channels_profile_flow_id_option_id_pk" PRIMARY KEY("profile_flow_id","option_id"),
	CONSTRAINT "profile_discovery_channels_option_set_check" CHECK ("profile_discovery_channels"."option_set_key" = 'shared.discoveryChannels')
);
--> statement-breakpoint
CREATE TABLE "profile_flows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"catalog_version_id" uuid NOT NULL,
	"flow_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_flows_profile_id_flow_type_unique" UNIQUE("profile_id","flow_type"),
	CONSTRAINT "profile_flows_id_catalog_version_id_unique" UNIQUE("id","catalog_version_id"),
	CONSTRAINT "profile_flows_id_catalog_version_id_flow_type_unique" UNIQUE("id","catalog_version_id","flow_type"),
	CONSTRAINT "profile_flows_type_check" CHECK ("profile_flows"."flow_type" in ('bachelors', 'microcredentials'))
);
--> statement-breakpoint
CREATE TABLE "profile_microcredential_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_flow_id" uuid NOT NULL,
	"catalog_version_id" uuid NOT NULL,
	"flow_type" text DEFAULT 'microcredentials' NOT NULL,
	"gender_option_set_key" text DEFAULT 'microcredentials.gender' NOT NULL,
	"gender_option_id" uuid,
	"civil_status_option_set_key" text DEFAULT 'microcredentials.civilStatus' NOT NULL,
	"civil_status_option_id" uuid,
	"monthly_income_option_set_key" text DEFAULT 'microcredentials.monthlyIncome' NOT NULL,
	"monthly_income_option_id" uuid,
	"student_status_option_set_key" text DEFAULT 'microcredentials.studentStatus' NOT NULL,
	"student_status_option_id" uuid,
	"certification_option_set_key" text DEFAULT 'microcredentials.certificationField' NOT NULL,
	"certification_option_id" uuid,
	"tin_number" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_microcredential_data_profile_flow_id_unique" UNIQUE("profile_flow_id"),
	CONSTRAINT "profile_microcredential_data_id_catalog_version_id_unique" UNIQUE("id","catalog_version_id"),
	CONSTRAINT "profile_microcredential_data_option_sets_check" CHECK ("profile_microcredential_data"."gender_option_set_key" = 'microcredentials.gender'
        and "profile_microcredential_data"."civil_status_option_set_key" = 'microcredentials.civilStatus'
        and "profile_microcredential_data"."monthly_income_option_set_key" = 'microcredentials.monthlyIncome'
        and "profile_microcredential_data"."student_status_option_set_key" = 'microcredentials.studentStatus'
        and "profile_microcredential_data"."certification_option_set_key" = 'microcredentials.certificationField'),
	CONSTRAINT "profile_microcredential_data_flow_type_check" CHECK ("profile_microcredential_data"."flow_type" = 'microcredentials')
);
--> statement-breakpoint
CREATE TABLE "profile_study_reasons" (
	"bachelor_data_id" uuid NOT NULL,
	"catalog_version_id" uuid NOT NULL,
	"option_set_key" text DEFAULT 'bachelors.studyReasons' NOT NULL,
	"option_id" uuid NOT NULL,
	CONSTRAINT "profile_study_reasons_bachelor_data_id_option_id_pk" PRIMARY KEY("bachelor_data_id","option_id"),
	CONSTRAINT "profile_study_reasons_option_set_check" CHECK ("profile_study_reasons"."option_set_key" = 'bachelors.studyReasons')
);
--> statement-breakpoint
CREATE TABLE "profile_related_people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bachelor_data_id" uuid NOT NULL,
	"catalog_version_id" uuid NOT NULL,
	"role" text NOT NULL,
	"living_status_option_set_key" text,
	"living_status_option_id" uuid,
	"given_name" text,
	"middle_name" text,
	"family_name" text,
	"suffix_option_set_key" text DEFAULT 'shared.suffix' NOT NULL,
	"suffix_option_id" uuid,
	"birthdate" date,
	"landline" text,
	"mobile" text,
	"email" text,
	"occupation" text,
	"relationship_option_set_key" text,
	"relationship_option_id" uuid,
	"relationship_other" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_related_people_bachelor_data_id_role_unique" UNIQUE("bachelor_data_id","role"),
	CONSTRAINT "profile_related_people_id_catalog_version_id_unique" UNIQUE("id","catalog_version_id"),
	CONSTRAINT "profile_related_people_role_options_check" CHECK ((
        "profile_related_people"."role" = 'father'
        and "profile_related_people"."living_status_option_set_key" = 'bachelors.fthrDeceased'
        and "profile_related_people"."relationship_option_set_key" is null
        and "profile_related_people"."relationship_option_id" is null
      ) or (
        "profile_related_people"."role" = 'mother'
        and "profile_related_people"."living_status_option_set_key" = 'bachelors.mthrDeceased'
        and "profile_related_people"."relationship_option_set_key" is null
        and "profile_related_people"."relationship_option_id" is null
      ) or (
        "profile_related_people"."role" = 'guardian'
        and "profile_related_people"."living_status_option_set_key" is null
        and "profile_related_people"."living_status_option_id" is null
        and "profile_related_people"."relationship_option_set_key" = 'bachelors.grdnApplRelationship'
      )),
	CONSTRAINT "profile_related_people_suffix_option_set_check" CHECK ("profile_related_people"."suffix_option_set_key" = 'shared.suffix')
);
--> statement-breakpoint
CREATE TABLE "profile_related_person_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"related_person_id" uuid NOT NULL,
	"catalog_version_id" uuid NOT NULL,
	"address_type" text NOT NULL,
	"same_as_applicant" boolean DEFAULT false NOT NULL,
	"country_option_set_key" text DEFAULT 'shared.country' NOT NULL,
	"country_option_id" uuid,
	"address_line_1" text,
	"address_line_2" text,
	"province_option_set_key" text DEFAULT 'shared.province' NOT NULL,
	"province_option_id" uuid,
	"municipality_option_set_key" text DEFAULT 'shared.municipality' NOT NULL,
	"municipality_option_id" uuid,
	"barangay_option_set_key" text DEFAULT 'shared.barangay' NOT NULL,
	"barangay_option_id" uuid,
	"zip_code" text,
	"province_municipality_dependency_type" text DEFAULT 'province_to_municipality' NOT NULL,
	"municipality_barangay_dependency_type" text DEFAULT 'municipality_to_barangay' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_related_person_addresses_related_person_id_address_type_unique" UNIQUE("related_person_id","address_type"),
	CONSTRAINT "profile_related_person_addresses_type_check" CHECK ("profile_related_person_addresses"."address_type" in ('current', 'permanent')),
	CONSTRAINT "profile_related_person_addresses_option_sets_check" CHECK ("profile_related_person_addresses"."country_option_set_key" = 'shared.country'
        and "profile_related_person_addresses"."province_option_set_key" = 'shared.province'
        and "profile_related_person_addresses"."municipality_option_set_key" = 'shared.municipality'
        and "profile_related_person_addresses"."barangay_option_set_key" = 'shared.barangay')
);
--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "program" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "cohort" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD COLUMN "bachelor_data_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD COLUMN "applicant_personal_id_fixture_uri" text;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD COLUMN "applicant_personal_id_original_filename" text;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD COLUMN "applicant_personal_id_mime_type" text;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD COLUMN "applicant_personal_id_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD COLUMN "proof_of_hs_completion_fixture_uri" text;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD COLUMN "proof_of_hs_completion_original_filename" text;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD COLUMN "proof_of_hs_completion_mime_type" text;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD COLUMN "proof_of_hs_completion_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "catalog_version_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "suffix_option_set_key" text DEFAULT 'shared.suffix' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "suffix_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "nationality_option_set_key" text DEFAULT 'shared.nationality' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "nationality_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "current_country_option_set_key" text DEFAULT 'shared.country' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "current_country_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "current_province_option_set_key" text DEFAULT 'shared.province' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "current_province_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "current_municipality_option_set_key" text DEFAULT 'shared.municipality' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "current_municipality_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "current_barangay_option_set_key" text DEFAULT 'shared.barangay' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "current_barangay_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "province_municipality_dependency_type" text DEFAULT 'province_to_municipality' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD COLUMN "municipality_barangay_dependency_type" text DEFAULT 'municipality_to_barangay' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "microcredential_data_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "catalog_version_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "device_access_option_set_key" text DEFAULT 'microcredentials.deviceAccess' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "device_access_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "internet_option_set_key" text DEFAULT 'microcredentials.internetConnectivity' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "internet_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "software_skills_option_set_key" text DEFAULT 'microcredentials.softwareSkills' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "software_skills_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "online_platforms_option_set_key" text DEFAULT 'microcredentials.onlineLearningPlatforms' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "online_platforms_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "time_commitment_option_set_key" text DEFAULT 'microcredentials.timeCommitment' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "time_commitment_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "self_discipline_option_set_key" text DEFAULT 'microcredentials.selfDiscipline' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "self_discipline_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "time_management_option_set_key" text DEFAULT 'microcredentials.timeManagement' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "time_management_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "learning_goal_option_set_key" text DEFAULT 'microcredentials.learningGoals' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD COLUMN "learning_goal_option_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "catalog_version_id" uuid;--> statement-breakpoint
ALTER TABLE "application_snapshots" ADD CONSTRAINT "application_snapshots_e2e_run_id_e2e_runs_id_fk" FOREIGN KEY ("e2e_run_id") REFERENCES "public"."e2e_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_snapshots" ADD CONSTRAINT "application_snapshots_profile_flow_id_catalog_version_id_profile_flows_id_catalog_version_id_fk" FOREIGN KEY ("profile_flow_id","catalog_version_id") REFERENCES "public"."profile_flows"("id","catalog_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollmate_option_dependencies" ADD CONSTRAINT "enrollmate_option_dependencies_catalog_version_id_parent_option_id_enrollmate_options_catalog_version_id_id_fk" FOREIGN KEY ("catalog_version_id","parent_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollmate_option_dependencies" ADD CONSTRAINT "enrollmate_option_dependencies_catalog_version_id_child_option_id_enrollmate_options_catalog_version_id_id_fk" FOREIGN KEY ("catalog_version_id","child_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollmate_option_sets" ADD CONSTRAINT "enrollmate_option_sets_catalog_version_id_enrollmate_catalog_versions_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."enrollmate_catalog_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollmate_options" ADD CONSTRAINT "enrollmate_options_catalog_version_id_option_set_key_enrollmate_option_sets_catalog_version_id_key_fk" FOREIGN KEY ("catalog_version_id","option_set_key") REFERENCES "public"."enrollmate_option_sets"("catalog_version_id","key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_profile_flow_id_catalog_version_id_flow_type_profile_flows_id_catalog_version_id_flow_type_fk" FOREIGN KEY ("profile_flow_id","catalog_version_id","flow_type") REFERENCES "public"."profile_flows"("id","catalog_version_id","flow_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_term_option_fk" FOREIGN KEY ("catalog_version_id","term_option_set_key","term_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_gender_option_fk" FOREIGN KEY ("catalog_version_id","gender_option_set_key","gender_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_civil_status_option_fk" FOREIGN KEY ("catalog_version_id","civil_status_option_set_key","civil_status_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_monthly_income_option_fk" FOREIGN KEY ("catalog_version_id","monthly_income_option_set_key","monthly_income_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_student_status_option_fk" FOREIGN KEY ("catalog_version_id","student_status_option_set_key","student_status_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_major_option_fk" FOREIGN KEY ("catalog_version_id","major_option_set_key","major_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_specialization_option_fk" FOREIGN KEY ("catalog_version_id","specialization_option_set_key","specialization_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_learning_hub_option_fk" FOREIGN KEY ("catalog_version_id","learning_hub_option_set_key","learning_hub_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_student_type_option_fk" FOREIGN KEY ("catalog_version_id","student_type_option_set_key","student_type_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_sub_student_type_option_fk" FOREIGN KEY ("catalog_version_id","sub_student_type_option_set_key","sub_student_type_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_religion_option_fk" FOREIGN KEY ("catalog_version_id","religion_option_set_key","religion_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_strand_option_fk" FOREIGN KEY ("catalog_version_id","strand_option_set_key","strand_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_permanent_country_option_fk" FOREIGN KEY ("catalog_version_id","permanent_country_option_set_key","permanent_country_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_permanent_province_option_fk" FOREIGN KEY ("catalog_version_id","permanent_province_option_set_key","permanent_province_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_permanent_municipality_option_fk" FOREIGN KEY ("catalog_version_id","permanent_municipality_option_set_key","permanent_municipality_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_permanent_barangay_option_fk" FOREIGN KEY ("catalog_version_id","permanent_barangay_option_set_key","permanent_barangay_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_scholarship_interest_option_fk" FOREIGN KEY ("catalog_version_id","scholarship_interest_option_set_key","scholarship_interest_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_scholarship_option_fk" FOREIGN KEY ("catalog_version_id","scholarship_option_set_key","scholarship_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_medical_condition_option_fk" FOREIGN KEY ("catalog_version_id","medical_condition_option_set_key","medical_condition_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_guardian_assignment_option_fk" FOREIGN KEY ("catalog_version_id","guardian_assignment_option_set_key","guardian_assignment_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_major_specialization_fk" FOREIGN KEY ("catalog_version_id","major_specialization_dependency_type","major_option_id","specialization_option_id") REFERENCES "public"."enrollmate_option_dependencies"("catalog_version_id","dependency_type","parent_option_id","child_option_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_province_municipality_fk" FOREIGN KEY ("catalog_version_id","province_municipality_dependency_type","permanent_province_option_id","permanent_municipality_option_id") REFERENCES "public"."enrollmate_option_dependencies"("catalog_version_id","dependency_type","parent_option_id","child_option_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_bachelor_data" ADD CONSTRAINT "profile_bachelor_data_municipality_barangay_fk" FOREIGN KEY ("catalog_version_id","municipality_barangay_dependency_type","permanent_municipality_option_id","permanent_barangay_option_id") REFERENCES "public"."enrollmate_option_dependencies"("catalog_version_id","dependency_type","parent_option_id","child_option_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_discovery_channels" ADD CONSTRAINT "profile_discovery_channels_profile_flow_id_catalog_version_id_profile_flows_id_catalog_version_id_fk" FOREIGN KEY ("profile_flow_id","catalog_version_id") REFERENCES "public"."profile_flows"("id","catalog_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_discovery_channels" ADD CONSTRAINT "profile_discovery_channels_option_fk" FOREIGN KEY ("catalog_version_id","option_set_key","option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_microcredential_data" ADD CONSTRAINT "profile_microcredential_data_profile_flow_id_catalog_version_id_flow_type_profile_flows_id_catalog_version_id_flow_type_fk" FOREIGN KEY ("profile_flow_id","catalog_version_id","flow_type") REFERENCES "public"."profile_flows"("id","catalog_version_id","flow_type") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_microcredential_data" ADD CONSTRAINT "profile_microcredential_data_gender_option_fk" FOREIGN KEY ("catalog_version_id","gender_option_set_key","gender_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_microcredential_data" ADD CONSTRAINT "profile_microcredential_data_civil_status_option_fk" FOREIGN KEY ("catalog_version_id","civil_status_option_set_key","civil_status_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_microcredential_data" ADD CONSTRAINT "profile_microcredential_data_monthly_income_option_fk" FOREIGN KEY ("catalog_version_id","monthly_income_option_set_key","monthly_income_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_microcredential_data" ADD CONSTRAINT "profile_microcredential_data_student_status_option_fk" FOREIGN KEY ("catalog_version_id","student_status_option_set_key","student_status_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_microcredential_data" ADD CONSTRAINT "profile_microcredential_data_certification_option_fk" FOREIGN KEY ("catalog_version_id","certification_option_set_key","certification_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_study_reasons" ADD CONSTRAINT "profile_study_reasons_bachelor_data_id_catalog_version_id_profile_bachelor_data_id_catalog_version_id_fk" FOREIGN KEY ("bachelor_data_id","catalog_version_id") REFERENCES "public"."profile_bachelor_data"("id","catalog_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_study_reasons" ADD CONSTRAINT "profile_study_reasons_option_fk" FOREIGN KEY ("catalog_version_id","option_set_key","option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_people" ADD CONSTRAINT "profile_related_people_bachelor_data_id_catalog_version_id_profile_bachelor_data_id_catalog_version_id_fk" FOREIGN KEY ("bachelor_data_id","catalog_version_id") REFERENCES "public"."profile_bachelor_data"("id","catalog_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_people" ADD CONSTRAINT "profile_related_people_living_status_option_fk" FOREIGN KEY ("catalog_version_id","living_status_option_set_key","living_status_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_people" ADD CONSTRAINT "profile_related_people_suffix_option_fk" FOREIGN KEY ("catalog_version_id","suffix_option_set_key","suffix_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_people" ADD CONSTRAINT "profile_related_people_relationship_option_fk" FOREIGN KEY ("catalog_version_id","relationship_option_set_key","relationship_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_person_addresses" ADD CONSTRAINT "profile_related_person_addresses_related_person_id_catalog_version_id_profile_related_people_id_catalog_version_id_fk" FOREIGN KEY ("related_person_id","catalog_version_id") REFERENCES "public"."profile_related_people"("id","catalog_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_person_addresses" ADD CONSTRAINT "profile_related_person_addresses_country_option_fk" FOREIGN KEY ("catalog_version_id","country_option_set_key","country_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_person_addresses" ADD CONSTRAINT "profile_related_person_addresses_province_option_fk" FOREIGN KEY ("catalog_version_id","province_option_set_key","province_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_person_addresses" ADD CONSTRAINT "profile_related_person_addresses_municipality_option_fk" FOREIGN KEY ("catalog_version_id","municipality_option_set_key","municipality_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_person_addresses" ADD CONSTRAINT "profile_related_person_addresses_barangay_option_fk" FOREIGN KEY ("catalog_version_id","barangay_option_set_key","barangay_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_person_addresses" ADD CONSTRAINT "profile_related_person_addresses_province_municipality_fk" FOREIGN KEY ("catalog_version_id","province_municipality_dependency_type","province_option_id","municipality_option_id") REFERENCES "public"."enrollmate_option_dependencies"("catalog_version_id","dependency_type","parent_option_id","child_option_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_related_person_addresses" ADD CONSTRAINT "profile_related_person_addresses_municipality_barangay_fk" FOREIGN KEY ("catalog_version_id","municipality_barangay_dependency_type","municipality_option_id","barangay_option_id") REFERENCES "public"."enrollmate_option_dependencies"("catalog_version_id","dependency_type","parent_option_id","child_option_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_bachelor_data_id_profile_bachelor_data_id_fk" FOREIGN KEY ("bachelor_data_id") REFERENCES "public"."profile_bachelor_data"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_catalog_version_id_enrollmate_catalog_versions_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."enrollmate_catalog_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_suffix_option_fk" FOREIGN KEY ("catalog_version_id","suffix_option_set_key","suffix_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_nationality_option_fk" FOREIGN KEY ("catalog_version_id","nationality_option_set_key","nationality_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_current_country_option_fk" FOREIGN KEY ("catalog_version_id","current_country_option_set_key","current_country_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_current_province_option_fk" FOREIGN KEY ("catalog_version_id","current_province_option_set_key","current_province_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_current_municipality_option_fk" FOREIGN KEY ("catalog_version_id","current_municipality_option_set_key","current_municipality_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_current_barangay_option_fk" FOREIGN KEY ("catalog_version_id","current_barangay_option_set_key","current_barangay_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_current_province_municipality_fk" FOREIGN KEY ("catalog_version_id","province_municipality_dependency_type","current_province_option_id","current_municipality_option_id") REFERENCES "public"."enrollmate_option_dependencies"("catalog_version_id","dependency_type","parent_option_id","child_option_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_current_municipality_barangay_fk" FOREIGN KEY ("catalog_version_id","municipality_barangay_dependency_type","current_municipality_option_id","current_barangay_option_id") REFERENCES "public"."enrollmate_option_dependencies"("catalog_version_id","dependency_type","parent_option_id","child_option_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_microcredential_data_id_profile_microcredential_data_id_fk" FOREIGN KEY ("microcredential_data_id") REFERENCES "public"."profile_microcredential_data"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_microcredential_data_id_catalog_version_id_profile_microcredential_data_id_catalog_version_id_fk" FOREIGN KEY ("microcredential_data_id","catalog_version_id") REFERENCES "public"."profile_microcredential_data"("id","catalog_version_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_device_access_option_fk" FOREIGN KEY ("catalog_version_id","device_access_option_set_key","device_access_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_internet_option_fk" FOREIGN KEY ("catalog_version_id","internet_option_set_key","internet_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_software_skills_option_fk" FOREIGN KEY ("catalog_version_id","software_skills_option_set_key","software_skills_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_online_platforms_option_fk" FOREIGN KEY ("catalog_version_id","online_platforms_option_set_key","online_platforms_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_time_commitment_option_fk" FOREIGN KEY ("catalog_version_id","time_commitment_option_set_key","time_commitment_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_self_discipline_option_fk" FOREIGN KEY ("catalog_version_id","self_discipline_option_set_key","self_discipline_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_time_management_option_fk" FOREIGN KEY ("catalog_version_id","time_management_option_set_key","time_management_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_learning_goal_option_fk" FOREIGN KEY ("catalog_version_id","learning_goal_option_set_key","learning_goal_option_id") REFERENCES "public"."enrollmate_options"("catalog_version_id","option_set_key","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_catalog_version_id_enrollmate_catalog_versions_id_fk" FOREIGN KEY ("catalog_version_id") REFERENCES "public"."enrollmate_catalog_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_bachelor_data_id_unique" UNIQUE("bachelor_data_id");--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_microcredential_data_id_unique" UNIQUE("microcredential_data_id");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_catalog_version_id_unique" UNIQUE("id","catalog_version_id");--> statement-breakpoint
ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_personal_id_size_check" CHECK ("profile_documents"."applicant_personal_id_size_bytes" is null or "profile_documents"."applicant_personal_id_size_bytes" between 0 and 3145728);--> statement-breakpoint
ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_hs_completion_size_check" CHECK ("profile_documents"."proof_of_hs_completion_size_bytes" is null or "profile_documents"."proof_of_hs_completion_size_bytes" between 0 and 3145728);--> statement-breakpoint
ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_personal_id_extension_check" CHECK ("profile_documents"."applicant_personal_id_original_filename" is null or lower("profile_documents"."applicant_personal_id_original_filename") ~ '\.(pdf|jpe?g|png|xlsx?|docx)$');--> statement-breakpoint
ALTER TABLE "profile_documents" ADD CONSTRAINT "profile_documents_hs_completion_extension_check" CHECK ("profile_documents"."proof_of_hs_completion_original_filename" is null or lower("profile_documents"."proof_of_hs_completion_original_filename") ~ '\.(pdf|jpe?g|png|xlsx?|docx)$');--> statement-breakpoint
ALTER TABLE "profile_enrollment_data" ADD CONSTRAINT "profile_enrollment_data_option_set_keys_check" CHECK ("profile_enrollment_data"."suffix_option_set_key" = 'shared.suffix'
        and "profile_enrollment_data"."nationality_option_set_key" = 'shared.nationality'
        and "profile_enrollment_data"."current_country_option_set_key" = 'shared.country'
        and "profile_enrollment_data"."current_province_option_set_key" = 'shared.province'
        and "profile_enrollment_data"."current_municipality_option_set_key" = 'shared.municipality'
        and "profile_enrollment_data"."current_barangay_option_set_key" = 'shared.barangay');--> statement-breakpoint
ALTER TABLE "profile_learner_readiness" ADD CONSTRAINT "profile_learner_readiness_option_sets_check" CHECK ("profile_learner_readiness"."device_access_option_set_key" = 'microcredentials.deviceAccess'
        and "profile_learner_readiness"."internet_option_set_key" = 'microcredentials.internetConnectivity'
        and "profile_learner_readiness"."software_skills_option_set_key" = 'microcredentials.softwareSkills'
        and "profile_learner_readiness"."online_platforms_option_set_key" = 'microcredentials.onlineLearningPlatforms'
        and "profile_learner_readiness"."time_commitment_option_set_key" = 'microcredentials.timeCommitment'
        and "profile_learner_readiness"."self_discipline_option_set_key" = 'microcredentials.selfDiscipline'
        and "profile_learner_readiness"."time_management_option_set_key" = 'microcredentials.timeManagement'
        and "profile_learner_readiness"."learning_goal_option_set_key" = 'microcredentials.learningGoals');