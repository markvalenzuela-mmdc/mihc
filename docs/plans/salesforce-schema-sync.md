# Salesforce Schema Sync

## Overview

Sync the database schema to match the Salesforce `IPYG_Application__c` object. The application record contains ~70+ fields across multiple sections that are not yet in our Drizzle schema.

## Entity Relationship

```
profiles ──┬── profile_enrollment_data (1:1, extended)
           ├── profile_learner_readiness (1:1, new)
           ├── profile_payment_details (1:1, new)
           ├── profile_study_buddy (1:1, new)
           ├── profile_documents (1:1, new)
           ├── profile_additional_info (1:1, new)
           ├── profile_disclosures (1:1, new)
           └── profile_system_info (1:1, new)
```

## Changes

### 1. `profiles` — Expand `status` type

Current statuses: `ready | needs review`
New statuses: `new | guidance_needed | validated | verification | enrollment_confirmation | for_payment | payment_verification | completed`

Add `middleName` column.

### 2. `profile_enrollment_data` — Add ~18 columns

- Basic Info: `middle_name`, `suffix`, `landline`, `work_type`, `company_org_name`
- Application Tracking: `is_leap_pad_re_enrollment`, `is_self_enrolled`, `certification_field`, `lost_date`, `lost_reason`, `lost_reason_specific`, `lost_reason_remark`, `profile_locked_date`, `subscription_expiration_date`
- Address: `current_foreign_address`

### 3. New 1:1 tables (7 total)

Each follows the same pattern as `profile_enrollment_data`:
- UUID PK with `defaultRandom()`
- `profile_id` UUID FK → `profiles.id`, NOT NULL, UNIQUE
- `created_at` / `updated_at` timestamptz audit columns

| Table | Columns |
|---|---|
| `profile_learner_readiness` | assistance_need_score, computer_device_access, online_learning_platforms, software_skills, online_platforms_specified, internet_connectivity, time_commitment, time_management_effectiveness, self_discipline_confidence, learning_goal, challenges_provided, potential_challenges |
| `profile_payment_details` | program_fee, need_official_receipt, promo_code, tin_number, discounted_fee, business_name, payment_method, business_tin_number, proof_of_payment, business_address, is_renewal_payment, business_bir_2303_gdrive_link, proof_of_payment_gdrive_link, business_bir_2303_submitted_date, proof_of_payment_submitted_date, proof_of_payment_aa_remarks, timestamp_in_payment_verification |
| `profile_study_buddy` | sb_nominator, sb_nominee_name, sb_promo_code, sb_nominee_email |
| `profile_documents` | applicant_personal_id_gdrive_link, proof_of_hs_completion_gdrive_link, applicant_personal_id_submitted_date, proof_of_hs_completion_submitted_date |
| `profile_additional_info` | how_did_you_find_out, coursera_invite_sent, has_app_form_edits, coursera_invite_sent_date |
| `profile_disclosures` | data_privacy_1, marketing_notif_consent, data_privacy_2 |
| `profile_system_info` | is_sent_to_api, last_sent_to_api, is_api_error, api_error_message, change_record_type |

### 4. Relations

Add all 7 new tables as `one()` relations on `profilesRelations`.

### 5. Frontend types

Add view interfaces for each new table in `lib/mock-testing-data.ts`.

## Files to Touch

| File | Change |
|---|---|
| `lib/drizzle/schema/profiles.ts` | Modify `status`, add `middleName`, add enrollment data columns, create 7 new tables |
| `lib/drizzle/schema/relations.ts` | Add relations for all new tables |
| `lib/drizzle/schema/index.ts` | Barrel export (auto if added to same file) |
| `lib/mock-testing-data.ts` | Add view interfaces + mapping |
| `app/e2e-testing/_components/e2e-testing-client.tsx` | If references old types |

## Implementation Order

1. Schema definitions (profiles.ts)
2. Relations
3. Frontend view types
4. Generate Drizzle migration
5. Verify with `pnpm lint`
