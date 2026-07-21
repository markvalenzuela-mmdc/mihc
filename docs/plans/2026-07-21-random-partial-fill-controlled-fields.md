# Random Partial Fill Controlled Fields Implementation Plan

**Goal:** Keep dynamically revealed guardian controls controlled from their first render so Random partial fill updates the DOM immediately.

**Architecture:** Register every dynamic EnrollMate `AppField` with the existing type-appropriate empty value. Preserve hidden-value cleanup and generation rules, and remove the ineffective listener-suppression workaround.

**Tech Stack:** TypeScript, React 19, TanStack Form 1.33, Base UI, Vitest, Testing Library, Chrome DevTools

---

## File Structure

- Modify `nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx` to supply dynamic field defaults.
- Modify `nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx` to remove the ineffective workaround.
- Modify `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx` to cover Living/Living/Others.

### Task 1: Keep Dynamic Fields Controlled

**Files:**
- Modify: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx`

- [x] **Step 1: Import the existing empty-value helper**

```ts
import { getEmptyEnrollmateFieldValue } from "@/feature/e2e/utils/e2e-profile-form.util";
```

- [x] **Step 2: Initialize each dynamic AppField**

```tsx
<controller.form.AppField
  name={`enrollmate.${definition.name}`}
  defaultValue={getEmptyEnrollmateFieldValue(definition) as never}
>
```

This initializes missing text/select/date values as `""`, checkboxes as
`false`, and files as `undefined` while preserving existing form values.

### Task 2: Remove the Ineffective Workaround

**Files:**
- Modify: `nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`

- [x] **Step 1: Restore normal programmatic listener behavior**

Remove `{ dontRunListeners: true }` from both mock assignment loops:

```ts
form.setFieldValue(
  `core.${fieldName}` as DeepKeys<E2eProfileFormValues>,
  value as never,
);
```

```ts
form.setFieldValue(
  `enrollmate.${fieldName}` as DeepKeys<E2eProfileFormValues>,
  value as never,
);
```

Do not add `flushSync`, render revisions, effects, or remount keys.

### Task 3: Correct and Run Regression Coverage

**Files:**
- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [x] **Step 1: Use the exact corrected workflow**

```ts
await chooseIndexedOption("Living Status", 0, "Living");
await chooseIndexedOption("Living Status", 1, "Living");
await chooseOption(
  "Who do you want to assign as your guardian?",
  "Others",
);
```

- [x] **Step 2: Assert values without navigation**

Assert non-empty Father First name, Mother First name, Guardian First name,
Guardian Birthdate, Relationship to Applicant, and Guardian Current Country.
Also assert both statuses remain `Living` and Guardian remains `Others`.

- [x] **Step 3: Run the focused test**

```powershell
pnpm --dir nextjs test --run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx -t "shows partial guardian mock values immediately"
```

Expected: PASS without Base UI uncontrolled-to-controlled warnings.

### Task 4: Verify in Chrome DevTools

**Files:**
- Verify `http://localhost:3000/e2e-testing/profiles/new?step=2`.

- [x] **Step 1: Reload and reproduce**

Select Father `Living`, Mother `Living`, Guardian `Others`, then Random partial
fill on a fresh form.

- [x] **Step 2: Inspect the immediate DOM**

Before any navigation, confirm representative father, mother, and guardian
fields display generated values.

- [x] **Step 3: Inspect diagnostics**

Confirm Chrome console and Next.js runtime diagnostics contain no new Base UI,
React, build, or runtime errors.

### Task 5: Run Full Verification and Commit

- [x] **Step 1: Run profile-form tests**

```powershell
pnpm --dir nextjs test --run __tests__/unit/feature/e2e/profile-form
```

- [x] **Step 2: Run all Next.js tests**

```powershell
pnpm --dir nextjs test --run
```

- [x] **Step 3: Run static checks**

```powershell
pnpm --dir nextjs exec tsc --noEmit
pnpm --dir nextjs lint
git diff --check
```

- [ ] **Step 4: Commit the verified correction**

```powershell
git add -- docs/plans/2026-07-21-random-partial-fill-controlled-fields.md nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
git commit -m "fix(enrollmate): control dynamic guardian fields"
```
