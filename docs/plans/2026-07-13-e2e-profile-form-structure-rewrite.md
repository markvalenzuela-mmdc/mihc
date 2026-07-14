# E2E Profile Form Structure Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unreadable profile-form action, service, config, and fixture modules with cohesive use-case modules while preserving behavior and leaving `nextjs/feature/e2e/components/` untouched.

**Architecture:** Server actions remain the authentication and transport boundary. Focused services use Drizzle directly for draft mutations, finalization, and editor reads; pure definition behavior moves to a utility and serializer; expected failures use one typed domain error.

**Tech Stack:** TypeScript, Next.js server actions, Drizzle ORM, Zod, Vitest, `@mihc/enrollmate-contract`.

---

## File map

**Create:**

- `nextjs/feature/e2e/errors/e2e-profile-form.error.ts` — expected form-domain error codes and messages.
- `nextjs/feature/e2e/services/e2e-profile-draft.service.ts` — draft validation plus create/edit transactions.
- `nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts` — complete-form validation transaction.
- `nextjs/feature/e2e/services/e2e-profile-form-editor.service.ts` — editor read-model query.
- `nextjs/feature/e2e/utils/e2e-profile-form.util.ts` — pure visibility, option, default, and stale-value helpers.
- `nextjs/feature/e2e/serializers/e2e-profile-form-editor.serializer.ts` — contract-step to editor-step mapping.

**Modify:**

- `nextjs/feature/e2e/actions/e2e-profile-form.action.ts` — narrow action orchestration and shared failure mapping.
- `nextjs/feature/e2e/services/e2e-profile-fixtures.service.ts` — focused synchronous fixture catalog.
- `nextjs/feature/e2e/schema/e2e-profile-form.schema.ts` — move all action input schemas beside the core schema.
- `nextjs/feature/e2e/types/e2e-profile-form.types.ts` — runtime-free action/service/editor contracts.
- Non-component consumers and tests — update imports to the focused modules.

**Delete:**

- `nextjs/feature/e2e/services/e2e-profile-form.service.ts` after all three use cases migrate.
- `nextjs/feature/e2e/config/e2e-profile-form.config.ts` after utility and serializer consumers migrate.

**Protected:**

- Do not edit any file under `nextjs/feature/e2e/components/`.
- Preserve all pre-existing worktree changes outside the files listed above.

### Task 1: Establish typed domain errors and input contracts

**Files:**

- Create: `nextjs/feature/e2e/errors/e2e-profile-form.error.ts`
- Modify: `nextjs/feature/e2e/schema/e2e-profile-form.schema.ts`
- Modify: `nextjs/feature/e2e/types/e2e-profile-form.types.ts`
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form.action.test.ts`

- [ ] Add `E2eProfileFormErrorCode` with `NOT_FOUND`, `EMAIL_CONFLICT`, `FLOW_CONFLICT`, and `DEFINITION_CONFLICT`, plus an `E2eProfileFormError` carrying one of those codes.
- [ ] Move JSON parsing, create/edit discriminated action schemas, and finalize profile-ID schema into `e2e-profile-form.schema.ts`.
- [ ] Define `SaveE2eProfileDraftInput`, `FinalizeE2eProfileFormInput`, fixture metadata, editor DTO, and the existing action-result union in `e2e-profile-form.types.ts`.
- [ ] Update action tests to construct the new error type and assert each code maps to the same existing result kind and message.
- [ ] Run `pnpm vitest run __tests__/unit/feature/e2e/profile-form/profile-form.action.test.ts` from `nextjs/`; expect the tests to fail only because production imports have not migrated yet.

### Task 2: Extract pure definition behavior

**Files:**

- Create: `nextjs/feature/e2e/utils/e2e-profile-form.util.ts`
- Create: `nextjs/feature/e2e/serializers/e2e-profile-form-editor.serializer.ts`
- Delete: `nextjs/feature/e2e/config/e2e-profile-form.config.ts`
- Modify: non-component consumers importing the deleted config module
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`

- [ ] Move `isEnrollmateFieldVisible`, `getEnrollmateFieldOptions`, `clearUnavailableFieldValues`, and `getDefaultFieldValues` unchanged into the utility.
- [ ] Move editor-step DTO mapping into `serializeE2eProfileFormEditorSteps`; keep section-ID normalization private to the serializer.
- [ ] Keep `narrowFlowType` only if a non-component consumer needs runtime narrowing; otherwise purge it.
- [ ] Replace imports in non-component consumers and tests, then delete the config module.
- [ ] Run `pnpm vitest run __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`; expect all definition-helper tests to pass.

### Task 3: Split draft persistence from finalization

**Files:**

- Create: `nextjs/feature/e2e/services/e2e-profile-draft.service.ts`
- Create: `nextjs/feature/e2e/services/e2e-profile-form-finalization.service.ts`
- Modify: `nextjs/__tests__/integration/e2e-profile-form-persistence.test.ts`

- [ ] Implement `saveE2eProfileDraft(input, db = getDb())`: parse core and step data, calculate the current definition hash, and dispatch to clearly named create or edit transaction helpers.
- [ ] Keep direct Drizzle operations in the service. Preserve atomic profile/form creation, row locks for editing, locked-flow enforcement, definition-hash enforcement, unique-email translation, and step-owned field replacement.
- [ ] Implement `finalizeE2eProfileForm(input, db = getDb())`: lock profile and form rows, reject missing or deprecated forms, parse the complete JSONB document, persist normalized data, and update `updatedBy` in one transaction.
- [ ] Update persistence tests to import the new services and assert `E2eProfileFormError.code` instead of importing four error classes.
- [ ] Run `pnpm vitest run __tests__/integration/e2e-profile-form-persistence.test.ts`; expect pass when the integration database is available, otherwise record the existing database blocker exactly.

### Task 4: Extract the editor read service and fixture catalog

**Files:**

- Create: `nextjs/feature/e2e/services/e2e-profile-form-editor.service.ts`
- Modify: `nextjs/feature/e2e/services/e2e-profile-fixtures.service.ts`
- Modify: non-component editor service consumers
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-fixtures.test.ts`

- [ ] Implement `getE2eProfileFormEditorData(profileId, db = getDb())` with the existing aggregate query, hash check, serialized steps, and fixture metadata.
- [ ] Make fixture-directory resolution, child-path validation, supported MIME values, and metadata creation small private helpers in the fixture service.
- [ ] Expose `getApprovedE2eProfileFixtures()` synchronously because it performs synchronous filesystem work; update only non-component consumers and tests.
- [ ] Run `pnpm vitest run __tests__/unit/feature/e2e/profile-form/profile-fixtures.test.ts`; expect all fixture catalog tests to pass.

### Task 5: Reduce server actions to transport orchestration

**Files:**

- Modify: `nextjs/feature/e2e/actions/e2e-profile-form.action.ts`
- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form.action.test.ts`

- [ ] Import action schemas, typed errors, and focused services from their owning modules.
- [ ] Keep operator resolution in the action because it belongs to authentication at the transport boundary.
- [ ] Add one local `mapProfileFormActionError(error)` helper that maps Zod issues and domain codes, logs unknown errors once, and returns the existing action-result variants.
- [ ] Make save and finalize actions follow the same readable sequence: resolve operator, validate input, call one service, revalidate paths, return success, map failure.
- [ ] Run `pnpm vitest run __tests__/unit/feature/e2e/profile-form/profile-form.action.test.ts`; expect all action tests to pass.

### Task 6: Remove superseded modules and verify the boundary

**Files:**

- Delete: `nextjs/feature/e2e/services/e2e-profile-form.service.ts`
- Verify: all files under `nextjs/feature/e2e/` except `components/`

- [ ] Run `rg 'e2e-profile-form\.service|config/e2e-profile-form\.config|ProfileForm(NotFound|FlowConflict|DefinitionConflict)|ProfileEmailConflict' nextjs --glob '!feature/e2e/components/**'`; expect no stale production imports or old error classes.
- [ ] Run the four focused Vitest files together and expect all unit tests to pass; record any unavailable integration database separately.
- [ ] Run the repository-supported TypeScript check and `pnpm lint` from `nextjs/`; distinguish new failures from pre-existing failures.
- [ ] Run `git diff --check` and inspect `git diff -- nextjs/feature/e2e nextjs/__tests__ docs/brainstorm docs/plans`.
- [ ] Confirm `git diff -- nextjs/feature/e2e/components` contains exactly the pre-existing user-owned component moves and no new edits from this rewrite.
- [ ] Confirm every changed line belongs to the approved rewrite and that all earlier worktree changes remain present.
