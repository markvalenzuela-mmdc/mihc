# Random Partial Fill Visual Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Random partial fill update the currently mounted parent/guardian controls immediately after both parent statuses are manually set to unavailable values.

**Architecture:** Keep mock generation and guardian business rules unchanged. Prevent form dependency listeners from replacing the complete EnrollMate object between individual programmatic mock assignments, then run the existing leaf-field cleanup once after the patch is complete.

**Tech Stack:** TypeScript, React 19, TanStack Form 1.33, Vitest, Testing Library

---

## File Structure

- Modify `nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx` to make mock patch application a controlled listener-free sequence followed by the existing cleanup.
- Modify `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx` to exercise the reported workflow with the real Random partial generator.

No shared contract, mock generator, renderer, or persistence files change.

### Task 1: Add the Random Partial Visual Regression

**Files:**
- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [x] **Step 1: Add a helper for duplicate parent-status labels**

Add a helper beside `chooseOption` that opens a specific matching combobox and selects its option:

```ts
async function chooseIndexedOption(
  controlName: string,
  controlIndex: number,
  optionName: string,
) {
  fireEvent.click(
    screen.getAllByRole("combobox", { name: controlName })[controlIndex]!,
  );
  const option = await screen.findByRole("option", { name: optionName });
  fireEvent.pointerDown(option);
  fireEvent.pointerUp(option);
  fireEvent.click(option);
}
```

- [x] **Step 2: Add the page-level workflow test**

Add a test in the `E2eProfileFormPage` describe block. It advances to the parent/guardian step, manually preserves unavailable parent statuses, uses the real Random partial generator, and checks representative generated controls before any navigation:

```ts
it("shows partial guardian mock values immediately after both parents become unavailable", async () => {
  renderPage();
  fillValidCore();
  await advanceToStep(2);

  await chooseIndexedOption("Living Status", 0, "Unknown");
  await chooseIndexedOption("Living Status", 1, "Deceased");

  fireEvent.click(getProfileFormActionButton("Mock current step"));
  fireEvent.click(screen.getByRole("button", { name: "Random partial fill" }));

  expect(
    screen.getByRole("combobox", {
      name: "Who do you want to assign as your guardian?",
    }),
  ).toHaveTextContent("Others");
  expect(
    screen.getByRole("textbox", { name: "Guardian First name" }),
  ).not.toHaveValue("");
  expect(
    screen.getByRole("combobox", { name: "Relationship to Applicant" }),
  ).not.toHaveTextContent("Select an option");
  expect(
    screen.getByRole("button", { name: "Guardian Birthdate" }),
  ).not.toHaveTextContent("Pick a date");
  expect(
    screen.getByRole("combobox", { name: "Guardian Current Country" }),
  ).not.toHaveTextContent("Select an option");
  expect(
    screen.getAllByRole("combobox", { name: "Living Status" })[0],
  ).toHaveTextContent("Unknown");
  expect(
    screen.getAllByRole("combobox", { name: "Living Status" })[1],
  ).toHaveTextContent("Deceased");
});
```

- [x] **Step 3: Run the workflow test before the controller change**

Run:

```powershell
pnpm --dir nextjs test --run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx -t "shows partial guardian mock values immediately"
```

Observed: PASS under jsdom before the controller change. The test runner does not reproduce the browser-only stale subscription symptom, but the test protects the exact statuses, real generator, immediate assertions, and representative text/select/date controls from regression.

### Task 2: Make Mock Patch Application Atomic With Respect to Listeners

**Files:**
- Modify: `nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`

- [ ] **Step 1: Suppress listeners for generated core assignments**

Update the generated core loop to pass only the listener-suppression option. Do not suppress dirty metadata or validation metadata:

```ts
for (const [fieldName, value] of Object.entries(generated.core)) {
  form.setFieldValue(
    `core.${fieldName}` as DeepKeys<E2eProfileFormValues>,
    value as never,
    { dontRunListeners: true },
  );
}
```

- [ ] **Step 2: Suppress listeners for generated EnrollMate assignments**

Apply the same option to every generated EnrollMate leaf update:

```ts
for (const [fieldName, value] of Object.entries(generated.enrollmate)) {
  form.setFieldValue(
    `enrollmate.${fieldName}` as DeepKeys<E2eProfileFormValues>,
    value as never,
    { dontRunListeners: true },
  );
}
```

Keep `clearMockUnavailableValues()` immediately after both loops. It computes compatibility from the complete patch and clears incompatible values through leaf updates, so mounted field controls receive the final state without an intermediate whole-object replacement.

- [ ] **Step 3: Run the focused regression**

Run:

```powershell
pnpm --dir nextjs test --run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx -t "shows partial guardian mock values immediately"
```

Expected: PASS.

- [ ] **Step 4: Run all profile-form unit tests**

Run:

```powershell
pnpm --dir nextjs test --run __tests__/unit/feature/e2e/profile-form
```

Expected: all profile-form tests pass, including existing full-fill, mock generation, guardian availability, visibility, and validation coverage.

### Task 3: Verify the Complete Next.js Surface

**Files:**
- Verify only; no additional files expected.

- [ ] **Step 1: Run the complete test suite**

Run:

```powershell
pnpm --dir nextjs test --run
```

Expected: all Next.js test files and tests pass.

- [ ] **Step 2: Run TypeScript checking**

Run:

```powershell
pnpm --dir nextjs exec tsc --noEmit
```

Expected: exit code 0 with no TypeScript diagnostics.

- [ ] **Step 3: Run lint**

Run:

```powershell
pnpm --dir nextjs lint
```

Expected: no new lint errors. Existing repository warnings may remain and must be reported accurately.

- [ ] **Step 4: Audit the final diff**

Run:

```powershell
git diff --check
git diff --stat
git status --short
```

Expected: only the controller, focused page test, and this implementation plan are changed; `git diff --check` exits successfully.

### Task 4: Commit the Fix

**Files:**
- Stage: `docs/plans/2026-07-21-random-partial-fill-visual-sync.md`
- Stage: `nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx`
- Stage: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] **Step 1: Stage only the planned files**

```powershell
git add -- docs/plans/2026-07-21-random-partial-fill-visual-sync.md nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
```

- [ ] **Step 2: Inspect the staged change**

```powershell
git diff --staged --check
git diff --staged --stat
git diff --staged --name-only
```

Expected: the staged set contains exactly the three planned files and has no whitespace errors.

- [ ] **Step 3: Commit**

```powershell
git commit -m "fix(enrollmate): sync partial mock field values"
```

Expected: one Conventional Commit containing the plan, regression test, and controller fix.
