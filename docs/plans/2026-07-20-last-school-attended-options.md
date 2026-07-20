# Last School Attended Options Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the ten UAT-verified Last School Attended options to the shared EnrollMate package so the Next.js profile form and seed generator use the same deterministic values.

**Architecture:** Keep `packages/enrollmate-contract` as the only option source. Normalize `lastSchoolAttended` as a reusable, conditionally required field; existing Next.js renderers and fixture builders will consume the resolved options without new UI or networking code.

**Tech Stack:** JSON contract definition, TypeScript, Zod, Vitest, Node test runner, pnpm.

---

## File Structure

- Modify `packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json`: declare the ten-school reusable option set and wire the bachelor field to it.
- Modify `nextjs/feature/e2e/utils/e2e-profile-form-mock.util.ts`: keep generated controller values stable while conditional fields converge.
- Modify `nextjs/lib/drizzle/seed/seed-profiles.ts`: force bachelor seed profiles onto the listed-school branch and select from the shared options.
- Modify `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`: assert the primary and manual school branches clear each other.
- Modify `nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts`: assert every generated bachelor seed uses a shared school option.
- Create `docs/plans/2026-07-20-last-school-attended-options.md`: retain this execution plan in the repository audit trail.

### Task 1: Restore the shared school option contract

**Files:**
- Modify: `packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json`
- Test: `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts`

- [ ] **Step 1: Run the existing contract regression test**

Run:

```powershell
Set-Location nextjs
node .\node_modules\vitest\vitest.mjs run __tests__/unit/lib/enrollmate-contract.test.ts
```

Expected: FAIL because `lastSchoolAttendedOptions` is absent and the field is still an unconditional external combobox.

- [ ] **Step 2: Add the verified reusable option set**

Add this entry under `reusableOptionSets` in `enrollmate-form-fields.json`:

```json
"lastSchoolAttendedOptions": [
  { "label": "Mapua University-Makati", "value": "Mapua University-Makati" },
  { "label": "Mapua University-Manila", "value": "Mapua University-Manila" },
  { "label": "Rizal National High School", "value": "Rizal National High School" },
  { "label": "Manila Science High School", "value": "Manila Science High School" },
  { "label": "Philippine Science High School", "value": "Philippine Science High School" },
  { "label": "Ateneo de Manila University, Inc.", "value": "Ateneo de Manila University, Inc." },
  { "label": "De La Salle-Araneta University", "value": "De La Salle-Araneta University" },
  { "label": "University of Santo Tomas", "value": "University of Santo Tomas" },
  { "label": "Adamson University", "value": "Adamson University" },
  { "label": "Polytechnic University of the Philippines", "value": "Polytechnic University of the Philippines" }
]
```

- [ ] **Step 3: Wire `lastSchoolAttended` to the reusable set**

Replace the current field definition with:

```json
{
  "id": "combobox",
  "name": "lastSchoolAttended",
  "label": "Last School Attended",
  "type": "combobox",
  "required": false,
  "description": "Choose from the available schools. If the school is not found, check the box to enter it manually.",
  "visibleWhen": {
    "field": "schoolNotFound",
    "equalsAny": [false]
  },
  "requiredWhenVisible": true,
  "optionSource": {
    "kind": "reusable",
    "optionSet": "lastSchoolAttendedOptions"
  }
}
```

- [ ] **Step 4: Run the contract regression test**

Run the Step 1 command again.

Expected: PASS, including the ten-entry option-set, normalized option-source, and boolean conditional checks.

### Task 2: Align consumer and seed regression coverage

**Files:**
- Modify: `nextjs/feature/e2e/utils/e2e-profile-form-mock.util.ts`
- Modify: `nextjs/lib/drizzle/seed/seed-profiles.ts`
- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`
- Modify: `nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts`

- [ ] **Step 1: Correct the profile visibility expectations**

Change the `schoolNotFound: true` assertions to require the primary field to be hidden and removed:

```ts
expect(
  isEnrollmateFieldVisible(lastSchoolAttended, { schoolNotFound: true }),
).toBe(false);

expect(
  clearUnavailableE2eProfileFormValues(bachelors, {
    schoolNotFound: true,
    lastSchoolAttended: "Mapua University-Makati",
  }),
).not.toHaveProperty("lastSchoolAttended");
```

- [ ] **Step 2: Stabilize generated conditional controls**

Track fields generated while visible inside `getE2eProfileStepMockValues`. Do not regenerate a settled visible field on later convergence passes; remove it from the settled set if it becomes unavailable so it can be regenerated if it becomes visible again.

```ts
const generatedVisibleFields = new Set<string>();

// Inside the field loop, after resolving visibility:
if (
  isVisible &&
  !isDisabled &&
  generatedVisibleFields.has(field.name)
) {
  continue;
}

// When clearing an unavailable field:
generatedVisibleFields.delete(field.name);

// After generating an available field value:
generatedVisibleFields.add(field.name);
```

This freezes `schoolNotFound` after its first generated value while still allowing `lastSchoolAttended` and `lastschOther` to converge to the selected branch.

- [ ] **Step 3: Force persisted bachelor seeds onto the shared option branch**

After generating the form, resolve the `lastSchoolAttended` field from the shared flow and apply its first option to bachelor seed data:

```ts
const lastSchoolAttended = flow.steps
  .flatMap((step) => step.sections)
  .flatMap((section) => section.fields)
  .find((field) => field.name === "lastSchoolAttended");
const listedSchool = lastSchoolAttended?.options[0]?.value;

if (listedSchool) {
  current.enrollmate.schoolNotFound = false;
  current.enrollmate.lastSchoolAttended = listedSchool;
  delete current.enrollmate.lastschOther;
}
```

- [ ] **Step 4: Add explicit seed option coverage**

Import `getEnrollmateReusableOptionSets` and add this branch inside the parameterized seed test after creating `data`:

```ts
if (profile.flowType === "bachelors") {
  const schoolOptions = getEnrollmateReusableOptionSets()
    .lastSchoolAttendedOptions.map((option) => option.value);

  expect(data.schoolNotFound).toBe(false);
  expect(schoolOptions).toContain(data.lastSchoolAttended);
  expect(data).not.toHaveProperty("lastschOther");
}
```

This ensures persisted seed profiles always contain a valid shared option.

- [ ] **Step 5: Run focused Next.js tests**

Run:

```powershell
Set-Location nextjs
node .\node_modules\vitest\vitest.mjs run __tests__/unit/lib/enrollmate-contract.test.ts __tests__/unit/lib/enrollmate-fixture.test.ts __tests__/unit/lib/drizzle/seed/seed-profiles.test.ts __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts __tests__/unit/feature/e2e/profile-form/e2e-profile-form-validation.test.ts
```

Expected: all selected Vitest files pass.

### Task 3: Verify the shared boundary and finish the change

**Files:**
- Test: `playwright/server/__tests__/unit/enrollmate-contract.test.ts`
- Review: all modified files

- [ ] **Step 1: Run the Playwright server contract test**

Run:

```powershell
Set-Location playwright
node --import tsx --test server/__tests__/unit/enrollmate-contract.test.ts
```

Expected: PASS without launching a browser.

- [ ] **Step 2: Run repository integrity checks**

Run:

```powershell
Set-Location ..
git diff --check
git status --short
git diff -- packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json nextjs/feature/e2e/utils/e2e-profile-form-mock.util.ts nextjs/lib/drizzle/seed/seed-profiles.ts nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts docs/plans/2026-07-20-last-school-attended-options.md
```

Expected: no whitespace errors; only the planned package, test, and plan files are changed.

- [ ] **Step 3: Commit the implementation**

```powershell
git add -- packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json nextjs/feature/e2e/utils/e2e-profile-form-mock.util.ts nextjs/lib/drizzle/seed/seed-profiles.ts nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts nextjs/__tests__/unit/lib/drizzle/seed/seed-profiles.test.ts docs/plans/2026-07-20-last-school-attended-options.md
git commit -m "fix(enrollmate): restore last school options"
```

Expected: one scoped implementation commit following the documentation-only design commit.
