# E2E Profile Form Controller Review Amendment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Split the E2E profile-form god hook by responsibility while preserving its public controller API and current behavior.

**Architecture:** Keep useE2eProfileFormController as the workflow orchestrator. Move pure validation/error-map logic into a utility module, URL step state into a hook, TanStack field metadata into an error-adapter hook, and beforeunload registration into a lifecycle hook. Keep form listeners, hidden-value cleanup, mock generation, and finalization workflow in the controller, with one explicit pending-action lock.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, TanStack Form, Zod, nuqs, Vitest, Testing Library, pnpm.

---

## Scope and preservation rules

Create:

- nextjs/feature/e2e/components/profile-form/e2e-profile-form-validation.ts
- nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-step.ts
- nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-errors.ts
- nextjs/feature/e2e/components/profile-form/use-unsaved-profile-warning.ts
- nextjs/__tests__/unit/feature/e2e/profile-form/e2e-profile-form-validation.test.ts

Modify:

- nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx
- this plan's checkbox state during execution

Do not modify the existing controller design record, finalization-service
work, related docs, or nextjs/repomix-output.xml. Do not stage or commit unless
the user explicitly asks.

## Task 1: Establish the baseline

**Files:**

- Read: nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx
- Read: nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
- Read: nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx
- Read: current Git status and all diffs

- [x] **Step 1: Confirm the worktree**

Run:

~~~powershell
git status --short --branch
git diff
git diff --cached
~~~

Expected: existing user-owned files and nextjs/repomix-output.xml are present.
Do not reset, clean, stage, or commit anything.

- [x] **Step 2: Run characterization coverage**

Run:

~~~powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx __tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx
~~~

Expected: the existing page/navigation suites pass before editing. They cover
invalid-step handling, navigation, hidden-value cleanup, query
canonicalization, flow changes, finalization, pending UI, mocking, and dirty
form unload behavior.

## Task 2: Extract pure validation and error-map logic

**Files:**

- Create: nextjs/feature/e2e/components/profile-form/e2e-profile-form-validation.ts
- Create: nextjs/__tests__/unit/feature/e2e/profile-form/e2e-profile-form-validation.test.ts
- Modify: nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx

- [x] **Step 1: Move the pure helpers**

Create e2e-profile-form-validation.ts. Import
getEnrollmateStepValidator and type EnrollmateFlowType from
@mihc/enrollmate-contract, e2eProfileCoreSchema and E2eProfileCoreInput from
the schema, and the existing field-error/editor-step/action-error types.

Move these functions without changing their current behavior:

~~~ts
export const CORE_FIELD_ORDER = [
  "core.name",
  "core.middleName",
  "core.email",
  "core.flowType",
] as const;

export function clampStep(step: number, totalSteps: number) {
  return Math.min(Math.max(step, 1), totalSteps);
}

export function getIssueErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
  prefix: "core" | "enrollmate",
): E2eProfileFormFieldErrors {
  const errors: E2eProfileFormFieldErrors = {};
  for (const issue of issues) {
    const firstPath = issue.path[0];
    if (typeof firstPath !== "string") continue;
    const fieldName = prefix + "." + firstPath;
    errors[fieldName] = [...(errors[fieldName] ?? []), issue.message];
  }
  return errors;
}

export function getErrorMessages(errors: E2eProfileFormFieldErrors) {
  return [...new Set(Object.values(errors).flat())];
}

export function mergeFieldErrors(
  ...errorMaps: E2eProfileFormFieldErrors[]
): E2eProfileFormFieldErrors {
  return Object.assign({}, ...errorMaps);
}
~~~

Also move getOrderedErrorFields, isFieldErrorMap, and
normalizeActionFieldErrors unchanged. getOrderedErrorFields must use
CORE_FIELD_ORDER followed by the active flow's EnrollMate field names.
normalizeActionFieldErrors must preserve core. and enrollmate. names, prefix
the four core names with core., and prefix all other unqualified names with
enrollmate.

- [x] **Step 2: Add validateProfileFormStep**

Add these exact public contracts:

~~~ts
export type ValidateProfileFormStepInput = {
  core: unknown;
  enrollmate: Record<string, unknown>;
  flowType: EnrollmateFlowType;
  stepNumber: number;
};

export type ValidateProfileFormStepResult =
  | {
      ok: true;
      core: E2eProfileCoreInput;
      enrollmate: Record<string, unknown>;
    }
  | { ok: false; errors: E2eProfileFormFieldErrors };
~~~

Implement validateProfileFormStep by safe-parsing core with
e2eProfileCoreSchema and EnrollMate values with
getEnrollmateStepValidator(flowType, stepNumber).safeParse. Merge
getIssueErrors(core issues, "core") and getIssueErrors(step issues,
"enrollmate"). Return the error map when either parse fails; otherwise return
the two parsed data objects. This function is pure and must not navigate,
write form metadata, mutate values, or set React state.

- [x] **Step 3: Add focused pure tests**

Create e2e-profile-form-validation.test.ts with Vitest tests for:

~~~ts
it("maps repeated issues to the first path segment", () => {
  expect(
    getIssueErrors(
      [
        { path: ["email"], message: "Email is required." },
        { path: ["email", "domain"], message: "Email is invalid." },
      ],
      "core",
    ),
  ).toEqual({
    "core.email": ["Email is required.", "Email is invalid."],
  });
});

it("normalizes action field names by section", () => {
  expect(
    normalizeActionFieldErrors({
      email: ["Email is already used."],
      "enrollmate.givenName": ["Given name is required."],
      postalCode: ["Postal code is required."],
    }),
  ).toEqual({
    "core.email": ["Email is already used."],
    "enrollmate.givenName": ["Given name is required."],
    "enrollmate.postalCode": ["Postal code is required."],
  });
});

it("deduplicates error-summary messages in encounter order", () => {
  expect(
    getErrorMessages({
      "core.name": ["Required."],
      "core.email": ["Required.", "Invalid."],
    }),
  ).toEqual(["Required.", "Invalid."]);
});
~~~

Add success and failure tests for validateProfileFormStep using the existing
contract-validator mock setup. The failure case must assert both core and
EnrollMate field maps; the success case must assert parsed core and step data.

- [x] **Step 4: Wire the controller to the pure module**

Remove the controller-local CORE_FIELD_ORDER, ValidationIssue, clampStep,
getIssueErrors, getOrderedErrorFields, getErrorMessages, mergeFieldErrors,
isFieldErrorMap, and normalizeActionFieldErrors. Import the required values
from the new module.

Keep getCleanedEnrollmateValues in the controller because it writes cleaned
values and marks removed fields pristine. Replace validateActiveStep with:

~~~ts
function validateCurrentStep() {
  return validateProfileFormStep({
    core: form.state.values.core,
    enrollmate: getCleanedEnrollmateValues(),
    flowType,
    stepNumber: activeStep.step,
  });
}
~~~

The controller will pass validation.errors to the error adapter; the pure
module remains free of form side effects.

- [x] **Step 5: Verify the extracted pure behavior**

Run:

~~~powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/e2e-profile-form-validation.test.ts
~~~

Expected: all helper and high-level validator tests pass.

## Task 3: Extract URL step management

**Files:**

- Create: nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-step.ts
- Modify: nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx

- [x] **Step 1: Implement useE2eProfileFormStep**

Create a client hook that owns useQueryState with stepParamKey and
stepSearchParams. It must preserve the existing deferred canonicalization:

~~~ts
const activeStepNumber = clampStep(queryStep, steps.length);
const activeStep = steps[activeStepNumber - 1]!;

useEffect(() => {
  if (queryStep === activeStepNumber) return;
  const timeout = window.setTimeout(() => {
    void setQueryStep(activeStepNumber);
  }, 0);
  return () => window.clearTimeout(timeout);
}, [activeStepNumber, queryStep, setQueryStep]);
~~~

Return activeStep, activeStepNumber, goTo, goNext, and goPrevious. Each
navigation function calls setQueryStep with clampStep and returns its Promise.
goNext clamps at steps.length; goPrevious clamps at 1.

- [x] **Step 2: Replace controller URL state**

Remove useQueryState, parseAsInteger, the query canonicalization effect, and
direct setQueryStep calls from the controller. After deriving flowType and
steps, call useE2eProfileFormStep({ steps }) and use its active values and
navigation methods.

The form listener is created before the flow-dependent step hook can be
instantiated. Preserve the listener's immediate reset behavior with a small
ref bridge:

~~~ts
const resetNavigationRef = useRef<() => void>(() => undefined);

// Existing flowType listener:
resetNavigationRef.current();

// After navigation is created:
resetNavigationRef.current = () => {
  void navigation.goTo(1);
};
~~~

Keep the existing EnrollMate-default reset and validated-step reset in the
listener. Add an equivalent clear-errors ref once the error adapter exists.

- [x] **Step 3: Verify URL and navigation behavior**

Run:

~~~powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx __tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx
~~~

Expected: step advancement, previous-step navigation, invalid-query
canonicalization, and flow-change tests pass.

## Task 4: Extract the TanStack Form error adapter

**Files:**

- Create: nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-errors.ts
- Modify: nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx

- [x] **Step 1: Define a narrow form adapter contract**

In the new client hook, define E2eProfileErrorForm as a structural type with
only getFieldMeta and setFieldMeta. Use the actual TanStack
AnyFieldLikeMeta, AnyFieldLikeMetaBase, Updater, and DeepKeys types in this
contract; do not use any. The controller's extended form instance must satisfy
the contract without changing E2eProfileFormPageProps.

- [x] **Step 2: Implement show, clear, and messages**

The hook API is:

~~~ts
const errors = useE2eProfileFormErrors({
  form,
  steps,
  activeStepNumber: navigation.activeStepNumber,
  goToStep: navigation.goTo,
});

errors.messages;
errors.show(fieldErrors);
errors.clear();
~~~

writeErrorsToVisibleFields must iterate CORE_FIELD_ORDER followed by all
EnrollMate field paths, preserve the currentMeta guard, mark errored fields
touched, and write errors into errorMap.onSubmit. The public show method must
order fields with getOrderedErrorFields, find the first EnrollMate field's
owning step, set the summary immediately, navigate when needed, and defer
metadata writes with window.setTimeout until the owning step is rendered.
clear must write empty onSubmit values for every known field and clear the
summary.

- [x] **Step 3: Move controller error calls to the adapter**

Delete applyFieldErrors, setFieldErrors, and the old clearErrors from the
controller. Replace calls as follows:

~~~ts
if (!validation.ok) {
  errors.show(validation.errors);
  return;
}

if (!completeValidation.success) {
  errors.show(getIssueErrors(completeValidation.error.issues, "enrollmate"));
  return;
}

errors.clear();
~~~

Keep applyActionError as a short controller workflow helper. For field maps it
must call errors.show(normalizeActionFieldErrors(error)); for error codes it
must call the adapter's explicit showMessage(message) operation with the same
E2eProfileFormErrorCodeToMessage text. This keeps all summary state in one
place while preserving the existing public controller return value.

Return errors.messages as errorMessages. Use errors.clear for successful
finalization, mock completion, previous-step navigation, and flow changes.

- [x] **Step 4: Verify error projection and cross-step navigation**

Run:

~~~powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
~~~

Expected: invalid active-step errors stay on the active step, complete-form
errors navigate to the owning step, field errors and summaries render, and
successful operations clear the errors.

## Task 5: Extract unload handling and consolidate pending state

**Files:**

- Create: nextjs/feature/e2e/components/profile-form/use-unsaved-profile-warning.ts
- Modify: nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx

- [x] **Step 1: Add useUnsavedProfileWarning**

Create the independent client hook:

~~~ts
export function useUnsavedProfileWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function preventUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [isDirty]);
}
~~~

Call it once with the existing isDirty selector and remove the controller's
inline beforeunload effect.

- [x] **Step 2: Replace the pending boolean/ref combination**

Use:

~~~ts
type PendingAction = "navigating" | "finalizing";

const pendingActionRef = useRef<PendingAction | null>(null);
const [pendingAction, setPendingAction] =
  useState<PendingAction | null>(null);

const isPending = pendingAction !== null;
const isFinalizing = pendingAction === "finalizing";

async function runExclusive(
  action: PendingAction,
  operation: () => Promise<void>,
) {
  if (pendingActionRef.current) return;
  pendingActionRef.current = action;
  setPendingAction(action);
  try {
    await operation();
  } finally {
    pendingActionRef.current = null;
    setPendingAction(null);
  }
}
~~~

Use runExclusive("navigating", ...) for Continue and Previous and
runExclusive("finalizing", ...) for Finalize. Keep validation inside the
exclusive operation so duplicate synchronous clicks are blocked before the
first await. Use pendingActionRef.current for mock and field-change guards.

- [x] **Step 3: Rewrite Continue, Finalize, and Previous**

Continue must use this workflow:

~~~ts
async function continueToNextStep() {
  await runExclusive("navigating", async () => {
    const validation = validateCurrentStep();
    if (!validation.ok) {
      errors.show(validation.errors);
      return;
    }
    setValidatedSteps((current) => new Set(current).add(activeStep.step));
    errors.clear();
    await navigation.goNext();
  });
}
~~~

Finalize must validate the active step, run the full EnrollMate validator,
return its field errors through errors.show, call finalize with the parsed core
and EnrollMate data, map action failures through applyActionError, and call
errors.clear plus onFinish on success. Previous must clear errors and call
navigation.goPrevious inside runExclusive("navigating", ...), without
validating or finalizing.

- [x] **Step 4: Clean imports and preserve the controller contract**

Remove parseAsInteger and convert DeepKeys, SyntheticEvent, and
form-related interfaces to import type where applicable. Keep the default
export and return these exact property names:

~~~ts
activeStep, activeStepNumber, blockPendingFieldChange, errorMessages,
finalizeProfile, flowType, form, goToPreviousStep, isFinalizing, isPending,
mockCurrentStep, continueToNextStep, steps, validatedSteps
~~~

Do not change page props, action contracts, form values, mock behavior, or
hidden-value cleanup. Leave clearMockUnavailableValues in the controller
unless the focused diff proves it must move for correctness.

- [x] **Step 5: Run the complete focused suite**

Run:

~~~powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/e2e-profile-form-validation.test.ts __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx __tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx
~~~

Expected: all pure, page, and navigation tests pass, including pending UI and
dirty-form behavior.

## Task 6: Typecheck, lint, and audit the diff

**Files:**

- Verify: all new modules/tests and the controller
- Verify: prior design record, finalization-service work, and repomix output

- [x] **Step 1: Run typecheck**

Run:

~~~powershell
pnpm --dir nextjs exec tsc --noEmit
~~~

Expected: no new errors in the refactor files. Record unrelated pre-existing
errors without changing unrelated code.

- [x] **Step 2: Run lint**

Run:

~~~powershell
pnpm --dir nextjs run lint
~~~

Expected: exit code 0 with no unused imports or hook-rule violations in the
refactor files.

- [x] **Step 3: Inspect whitespace, status, and final diff**

Run:

~~~powershell
git diff --check
git diff --stat
git diff -- docs/brainstorm/2026-07-15-e2e-profile-form-controller-review-amendment.md
git diff -- docs/plans/2026-07-15-e2e-profile-form-controller-review-amendment.md
git diff -- nextjs/feature/e2e/components/profile-form
git status --short --branch
~~~

Expected: only the amendment docs, new focused modules/tests, and the
controller are changed by this task. The original design record, existing
finalization-service work, and nextjs/repomix-output.xml remain present and
unchanged.

## Execution results

- The focused validation and profile-form page suites pass: 2 files, 33 tests.
- The full profile-form unit directory reports 4 files passed and 2 files failed:
  78 tests passed, with two pre-existing EnrollMate renderer description
  assertions and one pre-existing async NewE2eProfilePage navigation assertion.
- Targeted lint passes with no warnings in the refactor files.
- Full Next.js lint exits successfully with 21 existing warnings outside this
  refactor.
- Next.js typecheck reports only the existing align prop error in
  nextjs/app/_components/login-form.tsx.
- git diff --check passes.

## Self-review

- Spec coverage: the amendment's four module boundaries, pending-action
  consolidation, preserved controller API, behavior invariants, and
  verification requirements are covered by Tasks 2–6.
- Placeholder scan: every implementation step names files, concrete APIs, and
  exact commands with expected results.
- Type consistency: tasks use E2eProfileFormFieldErrors,
  E2eProfileFormEditorStep, E2eProfileFormValues, and PendingAction
  consistently.
