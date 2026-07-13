# E2E Profile Form Page Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `e2e-profile-form-page.tsx` as a readable single-file module and align it with the current server-action result contract.

**Architecture:** Keep all page-specific behavior in the existing file. Organize it as types, pure helpers, small internal rendering components, one controller hook, and the exported composition component without changing visual behavior.

**Tech Stack:** React 19, Next.js 16, TanStack Form, nuqs, TypeScript, Vitest.

---

### Task 1: Update tests to the current action contract

**Files:**

- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] Change successful mocks to `{ ok: true, data: { profileId, nextStep } }`.
- [ ] Change validation mocks to `{ ok: false, error: { fieldName: [message] } }`.
- [ ] Change conflict and forbidden mocks to `{ ok: false, error: message }`.
- [ ] Run the page test and confirm the obsolete component contract fails.

### Task 2: Rewrite the component in one file

**Files:**

- Modify: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`

- [ ] Define explicit page props, values, intent, and action-error types at the top of the file.
- [ ] Add pure helpers for default values, active-step selection, current-flow resolution, step payload extraction, `FormData` construction, and action-error narrowing.
- [ ] Add small internal `ProfileFormStep` and `ProfileFormError` components for rendering only.
- [ ] Add one `useProfileFormController` hook that owns form initialization, flow cleanup, query step state, pending/error state, submission behavior, navigation intent, and unload protection.
- [ ] Make `ProfileFormPage` compose the progress, core fields, error, active step, and actions from controller output.
- [ ] Preserve existing props, `data-slot` attributes, child components, button behavior, focus behavior, and routes.

### Task 3: Verify and audit

**Files:**

- Verify: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`
- Verify: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] Run the page unit test and expect all tests to pass.
- [ ] Run `pnpm exec tsc --noEmit`; confirm page type errors are gone and report unrelated test errors separately if present.
- [ ] Run targeted ESLint on the component and test.
- [ ] Run `git diff --check` and inspect the final diff to confirm no unrelated files were changed by this rewrite.
