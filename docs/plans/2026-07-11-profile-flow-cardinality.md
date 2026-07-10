# Profile Flow Cardinality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make each profile represent exactly one EnrollMate flow and one profile form while preserving the form identity used by E2E snapshots.

**Architecture:** Keep profiles.flowType as the canonical flow field. Keep profile_forms as a separate JSONB-backed table with its existing UUID id, remove its duplicate flow_type, and enforce UNIQUE(profile_id) so the database allows at most one form per profile. Application-owned profile/form writes remain transactional, which supplies the required “at least one” half of the aggregate invariant.

**Tech Stack:** TypeScript, Next.js App Router, Drizzle ORM/Kit, PostgreSQL, Zod 4, Vitest, pnpm.

---

## Scope and source files

The approved design is recorded in docs/brainstorm/2026-07-11-profile-flow-cardinality.md.
The implementation is limited to the profile/form cardinality boundary; it does
not redesign the shared JSONB validator, seed value policy, or unrelated quality
gates.

Files to modify:

- nextjs/lib/drizzle/schema/profile-forms.ts — remove the child flow column and change the unique key to profile_id.
- nextjs/lib/drizzle/schema/relations.ts — expose profileForm as a singular relation.
- nextjs/lib/drizzle/seed/seed-profiles.ts — use the parent flow and upsert one form per profile.
- nextjs/feature/e2e/serializers/e2e-profile-form.serializer.ts — accept the parent profile flow when validating form data.
- nextjs/feature/e2e/services/e2e-profile.service.ts — query one form and fail clearly if the required form is absent.
- nextjs/feature/e2e/types/e2e-testing.types.ts — represent one workspace form without a duplicated flow field.
- nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts — display the singular form using profile.flowType.
- nextjs/feature/e2e/components/workspace/e2e-profile-workspace.tsx — compute run eligibility from the singular form.
- nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts — preserve validator and seed fixture coverage while removing child-flow assumptions.
- nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts — test singular relation shape and parent-flow validation/deprecation.
- nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts — test one form and profile-derived flow display.
- nextjs/__tests__/integration/profile-flow-cardinality.test.ts — add database-level uniqueness and relation coverage.
- nextjs/drizzle/ and nextjs/drizzle/meta/ — replace the disposable migration baseline through Drizzle Kit.
- docs/brainstorm/enrollmate-jsonb-profile-model.md — add a short amendment pointing to the approved cardinality decision.
- docs/README.md — include the cardinality amendment in the current EnrollMate source-of-truth map.

No files under playwright/tests/ or the parent task’s JSONB/quality-gate
surface are in scope.

### Task 1: Change the Drizzle schema and relations

**Files:**

- Modify: nextjs/lib/drizzle/schema/profile-forms.ts
- Modify: nextjs/lib/drizzle/schema/relations.ts
- Create: nextjs/__tests__/integration/profile-flow-cardinality.test.ts

- [ ] **Step 1: Add a failing database uniqueness test**

Create an integration test using the existing useIntegrationTestDatabase
helper. Insert a profile form for an existing seeded profile, then attempt a
second form with a different form ID and the same profileId:

~~~ts
await expect(
  db.insert(profileForms).values({
    id: randomUUID(),
    profileId: seededProfileId,
    definitionHash: getEnrollmateDefinitionHash(),
    data: {},
  }),
).rejects.toThrow();
~~~

The test should also query the profile with with: { profileForm: true } and
assert that the returned relation is one object rather than an array.

- [ ] **Step 2: Run the focused test to verify the current schema fails**

Run from nextjs/:

~~~powershell
pnpm test __tests__/integration/profile-flow-cardinality.test.ts
~~~

Expected: FAIL because the current relation is named profileForms, the form
insert still requires flowType, and the current unique key does not match the
new one-to-one contract.

- [ ] **Step 3: Implement the minimal schema change**

In profile-forms.ts, remove the flowType property and replace the table
constraint with a single-column unique constraint:

~~~ts
profileId: uuid("profile_id")
  .notNull()
  .references(() => profiles.id),
// ...
(table) => [unique().on(table.profileId)],
~~~

In relations.ts, change the profile relation to singular:

~~~ts
export const profilesRelations = relations(profiles, ({ many, one }) => ({
  e2eRuns: many(e2eRuns),
  profileForm: one(profileForms),
}));
~~~

Keep profileForms.id and the snapshot foreign key unchanged.

- [ ] **Step 4: Regenerate the disposable migration baseline**

From nextjs/, remove the existing generated migration files and metadata
only after confirming the working tree contains no unrelated changes, then run:

~~~powershell
pnpm db:generate
~~~

Read the generated SQL and snapshot and confirm they contain a unique
profile_forms.profile_id constraint, no profile_forms.flow_type column,
and the existing profile_e2e_snapshots.profile_form_id foreign key.

- [ ] **Step 5: Run the focused schema test**

Run:

~~~powershell
pnpm test __tests__/integration/profile-flow-cardinality.test.ts
~~~

Expected: PASS for the unique constraint and singular relation after the test
database is reset with the generated baseline.

- [ ] **Step 6: Commit the schema boundary**

~~~powershell
git add nextjs/lib/drizzle/schema/profile-forms.ts nextjs/lib/drizzle/schema/relations.ts nextjs/drizzle nextjs/__tests__/integration/profile-flow-cardinality.test.ts
git commit -m "fix: enforce one profile form per profile"
~~~

### Task 2: Update seed persistence to the one-form aggregate

**Files:**

- Modify: nextjs/lib/drizzle/seed/seed-profiles.ts
- Test: nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts

- [ ] **Step 1: Add a failing assertion for one form per seeded profile**

Extend the seed test with a pure fixture assertion that every profile fixture
has exactly one flow type and no form-level flow override. Keep the existing
createProfileFormData(profile.flowType, ...) validator test unchanged.

- [ ] **Step 2: Update the form insert and conflict target**

Remove flowType from the profileForms values and replace the composite
conflict target with the single profile key:

~~~ts
await tx
  .insert(profileForms)
  .values({
    profileId: profile.id,
    definitionHash: getEnrollmateDefinitionHash(),
    data,
  })
  .onConflictDoUpdate({
    target: profileForms.profileId,
    set: {
      definitionHash: getEnrollmateDefinitionHash(),
      data,
    },
  });
~~~

Keep the profile insert and form upsert in the existing transaction supplied by
the seed entrypoint. The profile’s destructured flowType remains the input
to createProfileFormData and the shared validator.

- [ ] **Step 3: Run seed unit coverage**

Run:

~~~powershell
pnpm test __tests__/unit/lib/drizzle/seed/seed-profiles.test.ts
~~~

Expected: PASS with valid fixture data and no flowType property required on a
form insert.

- [ ] **Step 4: Commit the seed change**

~~~powershell
git add nextjs/lib/drizzle/seed/seed-profiles.ts nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts
git commit -m "fix: seed one form for each profile"
~~~

### Task 3: Make service serialization derive flow from the profile

**Files:**

- Modify: nextjs/feature/e2e/serializers/e2e-profile-form.serializer.ts
- Modify: nextjs/feature/e2e/services/e2e-profile.service.ts
- Modify: nextjs/feature/e2e/types/e2e-testing.types.ts
- Test: nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts

- [ ] **Step 1: Add failing service tests for the singular relation**

Change the service test fixture to return profileForm, not profileForms,
and add a case proving the serializer calls the validator with
profile.flowType:

~~~ts
expect(getEnrollmateValidator).toHaveBeenCalledWith("bachelors");
~~~

Add a missing-form case that expects getE2eProfileById to reject with a clear
profile-form integrity error. Preserve the existing active, deprecated, and
invalid state assertions.

- [ ] **Step 2: Pass the parent flow into the form serializer**

Change the serializer signature to accept the profile flow:

~~~ts
export function serializeE2eProfileForm(
  form: ProfileFormRecord,
  flowType: EnrollmateFlowType,
  currentDefinitionHash: string,
): E2eProfileForm {
  if (form.definitionHash !== currentDefinitionHash) {
    return { ...form, state: "deprecated" };
  }

  const result = getEnrollmateValidator(flowType).safeParse(form.data);
  if (result.success) {
    return { ...form, data: result.data, state: "active" };
  }

  return {
    ...form,
    state: "invalid",
    validationIssues: result.error.issues.map((issue) => ({
      path: issue.path.map(String).join(".") || "form",
      message: issue.message,
    })),
  };
}
~~~

Remove flowType from the returned form DTO. Keep the existing validation
issue serialization and state discriminant unchanged.

- [ ] **Step 3: Query and serialize the singular form**

In getE2eProfileById, request with: { profileForm: true }, assert that the
profile has a form, and serialize it with profile.flowType:

~~~ts
if (!profile.profileForm) {
  throw new Error("Profile form is required for profile workspace");
}

profileForm: serializeE2eProfileForm(
  profile.profileForm,
  profile.flowType,
  currentDefinitionHash,
),
~~~

Update E2eProfileWorkspaceProfile to expose profileForm: E2eProfileForm
instead of profileForms: E2eProfileForm[]. Keep E2eProfileSummary.flowType
unchanged.

- [ ] **Step 4: Run service unit coverage**

Run:

~~~powershell
pnpm test __tests__/unit/services/e2e/e2e-profile.service.test.ts
~~~

Expected: PASS for the singular relation, active/deprecated/invalid states,
parent-flow validator selection, and missing-form failure.

- [ ] **Step 5: Commit the service contract**

~~~powershell
git add nextjs/feature/e2e/serializers/e2e-profile-form.serializer.ts nextjs/feature/e2e/services/e2e-profile.service.ts nextjs/feature/e2e/types/e2e-testing.types.ts nextjs/__tests__/unit/services/e2e/e2e-profile.service.test.ts
git commit -m "fix: derive form flow from profile"
~~~

### Task 4: Update workspace consumers for one form

**Files:**

- Modify: nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts
- Modify: nextjs/feature/e2e/components/workspace/e2e-profile-workspace.tsx
- Modify: nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts

- [ ] **Step 1: Rewrite the sheet-group test fixture**

Replace the form array with one profileForm object and remove every
form-level flowType. Keep active, deprecated, invalid, empty-value, and
operational-data cases. The expected labels should use the parent profile’s
flowType.

- [ ] **Step 2: Use the profile flow in sheet rendering**

Pass profile.flowType into the form-group helpers and resolve the definition
with that value. The deprecated and invalid labels should be based on the
profile flow, while active fields continue to come from the form data and the
definition metadata.

- [ ] **Step 3: Render the singular form and run eligibility**

Update getProfileSheetGroups to include one form group, and update
E2eProfileWorkspace to use:

~~~ts
const canRun = profile.profileForm.state === "active";
~~~

Do not add a flow selector; a profile has only one assigned flow.

- [ ] **Step 4: Run the focused UI tests**

Run:

~~~powershell
pnpm test __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
~~~

Expected: PASS for profile summary display, active fields, empty values,
deprecated/invalid form messages, and operational data.

- [ ] **Step 5: Commit the workspace change**

~~~powershell
git add nextjs/feature/e2e/components/workspace/e2e-profile-sheet-groups.ts nextjs/feature/e2e/components/workspace/e2e-profile-workspace.tsx nextjs/__tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts
git commit -m "fix: render one profile form in workspace"
~~~

### Task 5: Add integration coverage and update source-of-truth docs

**Files:**

- Modify: nextjs/__tests__/integration/profile-flow-cardinality.test.ts
- Modify: docs/brainstorm/enrollmate-jsonb-profile-model.md
- Modify: docs/README.md

- [ ] **Step 1: Add database integration assertions**

Cover the following with the existing test database helper:

~~~ts
const profile = await db.query.profiles.findFirst({
  where: (profiles, { eq }) => eq(profiles.id, seededProfileId),
  with: { profileForm: true },
});

expect(profile?.profileForm?.profileId).toBe(seededProfileId);
expect(profile?.profileForm).not.toHaveProperty("flowType");
~~~

Also assert that a snapshot can reference the form’s retained id and that a
second form for the same profileId rejects with a unique-constraint error.

- [ ] **Step 2: Document the amendment in the current JSONB design**

Add an implementation amendment dated 2026-07-11 to
docs/brainstorm/enrollmate-jsonb-profile-model.md stating that the original
multi-flow-per-profile rule is superseded: each profile has one canonical
flow_type, profile_forms.profile_id is unique, and the child flow column
is removed. Link to the detailed cardinality brainstorm.

- [ ] **Step 3: Update the documentation source-of-truth map**

Add docs/brainstorm/2026-07-11-profile-flow-cardinality.md to the EnrollMate
implementation-document list in docs/README.md, identifying it as the
cardinality amendment that governs this change.

- [ ] **Step 4: Run integration coverage**

With TEST_DATABASE_URL configured, run:

~~~powershell
pnpm test __tests__/integration/profile-flow-cardinality.test.ts
~~~

Expected: PASS for the generated schema, singular relation, retained snapshot
foreign key, and one-form uniqueness.

- [ ] **Step 5: Commit integration and documentation changes**

~~~powershell
git add nextjs/__tests__/integration/profile-flow-cardinality.test.ts docs/brainstorm/enrollmate-jsonb-profile-model.md docs/README.md
git commit -m "docs: record profile flow cardinality amendment"
~~~

### Task 6: Run the scoped handoff checks

- [ ] **Step 1: Reset and seed the disposable database**

From nextjs/, run:

~~~powershell
pnpm db:reset
~~~

Expected: the regenerated baseline applies successfully and the seed completes
without duplicate profile forms.

- [ ] **Step 2: Run all affected unit and integration tests**

~~~powershell
pnpm test __tests__/unit/lib/drizzle/seed/seed-profiles.test.ts __tests__/unit/services/e2e/e2e-profile.service.test.ts __tests__/unit/feature/e2e/e2e-profile-sheet-groups.test.ts __tests__/integration/profile-flow-cardinality.test.ts
~~~

Expected: PASS with no test relying on a second flow or a form-level flow
field.

- [ ] **Step 3: Verify the final diff boundary**

From the repository root, run:

~~~powershell
git diff --check HEAD~6..HEAD
git status --short --branch
~~~

Confirm that the diff contains only the profile/form cardinality schema,
seed, service, workspace, migration, tests, and documentation changes. Do not
alter the parent task’s validator implementation, seed value policy, or broad
quality-gate configuration.

