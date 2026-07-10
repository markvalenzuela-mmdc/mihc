# Profile Flow Cardinality

**Status:** Approved design — implementation planning pending

## Context

The current JSONB profile model has two conflicting flow representations:

- `profiles.flow_type` is required and singular.
- `profile_forms` stores `flow_type` and currently allows one row per
  `(profile_id, flow_type)`, which permits two forms for one profile.

The approved JSONB profile model originally supported a reusable person with
independent Bachelor and Microcredential applications. The current product
rule is different: each profile is assigned exactly one EnrollMate flow, and
each profile has exactly one form for that flow.

The current repository state reflects the conflict in several places:

- `nextjs/lib/drizzle/schema/profiles.ts` defines the singular profile flow.
- `nextjs/lib/drizzle/schema/profile-forms.ts` defines a duplicated form flow
  and a composite uniqueness constraint.
- The E2E service and list/header UI treat the profile flow as singular.
- Workspace types and tests still model profile forms as a collection and test
  a profile containing both flows.
- The approved JSONB design document still describes the superseded multi-flow
  behavior.

The local database is disposable for this change. Existing data and snapshot
key compatibility do not constrain the replacement baseline.

## Decision

Keep `profiles.flow_type` as the only canonical flow discriminator. Keep
`profile_forms` as a separate table, but make its relationship to `profiles`
one-to-one:

```text
profiles
  id, name, middle_name, email, flow_type, status,
  operational_data jsonb, audit columns

profile_forms
  id, profile_id, definition_hash, data jsonb, audit columns
  UNIQUE(profile_id)

profile_e2e_snapshots
  id, profile_form_id, e2e_run_id nullable, definition_hash,
  payload_hash, raw_payload jsonb, captured_at
```

`profile_forms.profile_id` is required and references `profiles.id`.
`profile_forms.id` remains the form identity because snapshots are form-scoped
and retain their `profile_form_id` foreign key. `profile_forms.flow_type` is
removed as redundant data.

The application-owned aggregate invariant is:

```text
one profile + one canonical flow + one profile form
```

The database enforces the “at most one” half with `UNIQUE(profile_id)`. The
profile and form are created or repaired in one transaction, and the service
boundary does not expose independent form deletion. The application owns all
supported writes; arbitrary direct SQL is outside the supported write path.

## Alternatives considered

### Remove `profiles.flow_type` and derive all flow information

Rejected. It would make `profile_forms` the source of truth and require list
queries and UI summaries to aggregate a child row. It also weakens the domain
model now that every profile has exactly one assigned flow.

### Keep flow type in both tables and enforce equality

Rejected. The duplicate value provides no additional information and would
require a composite foreign key, trigger, or service checks to prevent drift.

### Merge form data into `profiles`

Rejected for this change. A separate form table keeps the large JSONB payload
and definition metadata out of lightweight profile-list reads, while retaining
the existing snapshot boundary.

### Use a shared primary key (`profile_forms.profile_id`)

Considered but not selected. The disposable database makes the key migration
possible, but retaining a form `id` preserves the existing snapshot identity
and makes the change smaller without weakening the one-to-one uniqueness rule.

### Add database triggers or deferred cyclic constraints

Rejected. They would attempt to make PostgreSQL enforce the “at least one”
half of the aggregate invariant, but add migration and write-order complexity
without a need in the application-owned persistence boundary.

## Consumer design

### Drizzle schema and relations

- Remove `flowType` from `profileForms`.
- Add `unique(profileId)` to `profileForms`.
- Keep `profileForms.id` as the primary key.
- Change the profile relation from `many(profileForms)` to singular
  `profileForm: one(...)`.
- Keep snapshot relations through `profileE2eSnapshots.profileFormId`.

### Seed and persistence

- Each seed profile declares exactly one `flowType`.
- Profile and form writes remain in the same transaction.
- Form data generation and Zod validation receive the parent profile flow.
- The form upsert conflicts on `profileId`, not `(profileId, flowType)`.
- A seed run repairs a missing form for an existing profile while still
  producing one form after the transaction commits.

### E2E service and types

- The workspace query loads `profileForm`, not a form collection.
- The service derives deprecation from the form definition hash as before.
- It resolves the active validator and definition from `profile.flowType`.
- A missing form in a workspace read is treated as a data-integrity failure,
  not silently represented as an empty form list.
- `E2eProfileSummary` continues to expose the singular profile `flowType`.
- `E2eProfileWorkspaceProfile` exposes one form and no duplicated form flow.
- Profile-scoped E2E runs remain unambiguous because the profile has one flow.

### UI

- The profile table and workspace header continue to display the canonical
  profile flow.
- Form display uses `profile.flowType` to load the definition.
- The workspace renders the singular form and retains deprecated-form handling.
- No UI supports choosing or displaying a second form for the same profile.

## Migration and verification

Because the database can be wiped, Drizzle will regenerate the replacement
baseline rather than preserving compatibility migrations. The regenerated
schema must include `UNIQUE(profile_forms.profile_id)` and no
`profile_forms.flow_type` column.

Verification must cover:

- schema inspection for the one-to-one constraint and singular relation;
- profile/form transactional seed behavior;
- rejection of a second form for the same profile;
- form validation using the parent profile flow;
- service serialization with one form and derived deprecation;
- workspace display using the profile flow;
- snapshot references continuing to resolve through `profile_forms.id`.

The implementation is isolated from the parent task's JSONB validation,
seed-generator refactor, and quality-gate work except where the removed child
flow field is necessarily touched.

## Open questions

None. The write boundary is application-owned transactional persistence, the
database may be reset, and a profile is defined to have exactly one assigned
flow and one form.
