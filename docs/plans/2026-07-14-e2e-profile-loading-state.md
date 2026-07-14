# Create E2E Profile Loading State Implementation Plan

> For agentic workers: use the executing-plans workflow to implement this plan task by task. Steps use checkbox syntax.

Goal: Replace the generic Create E2e “Saving profile…” message with a spinner on the action that is currently saving or navigating, while preserving the existing disabled-form behavior.

Architecture: Model pending work as a small action union with previous, continue, and finalize values in the form controller. The action bar renders the shared spinner only for the matching button and retains its current aria-busy action-group semantics. The route wrapper reports its final router.push transition to the form page so finalization feedback remains visible while navigation starts.

Tech Stack: Next.js 16 App Router, React 19 useTransition, TanStack Form, Tailwind CSS, Testing Library, Vitest, and TypeScript.

---

## File map

- Modify $HOME/Documents/Programming/mihc/nextjs/feature/e2e/types/e2e-profile-form.types.ts with the pending-action union.
- Modify $HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx to set and clear the action state around previous-step URL updates, draft saves, and finalization.
- Modify $HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx to render action-specific spinners and remove the generic status paragraph.
- Modify $HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx to combine controller pending state with route-transition state.
- Modify $HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-route.tsx to track the final router.push transition with useTransition.
- Modify $HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx for action-level accessibility and pending-state assertions.

Do not modify the shared EnrollMate contract, server actions, persistence services, Playwright tests, or the existing profile-mocking files.

## Task 1: Define the pending action contract

Files:

- Modify: $HOME/Documents/Programming/mihc/nextjs/feature/e2e/types/e2e-profile-form.types.ts

- [x] Step 1: Add the explicit pending-action type beside E2eProfileMockMode.

```ts
export type E2eProfileFormPendingAction =
  | "previous"
  | "continue"
  | "finalize";
```

Keep this type exported from the existing feature types module so the controller, page, and action bar share one contract.

- [x] Step 2: Run the typecheck after the type-only change.

Run from $HOME/Documents/Programming/mihc/nextjs/:

```sh
pnpm exec tsc --noEmit
```

Expected: the new union introduces no type errors.

## Task 2: Track which form operation is pending

Files:

- Modify: $HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx

- [x] Step 1: Replace the generic pending state with typed action state.

Import E2eProfileFormPendingAction and replace the boolean state with:

```ts
const [pendingAction, setPendingAction] = useState<
  E2eProfileFormPendingAction | undefined
>();
const isPending = pendingAction !== undefined;
```

Keep pendingRef as the synchronous duplicate-operation guard.

- [x] Step 2: Mark Continue saves as pending.

In saveAndContinue, keep validation before setting pending state. After validation succeeds, use:

```ts
pendingRef.current = true;
setPendingAction("continue");
```

In its existing finally block, clear with:

```ts
pendingRef.current = false;
setPendingAction(undefined);
```

Preserve all existing save success, action-error, exception, URL-update, and pristine-field behavior.

- [x] Step 3: Mark finalization as pending.

In finalizeProfile, after complete validation and the profile-id guard succeed, use:

```ts
pendingRef.current = true;
setPendingAction("finalize");
```

Use setPendingAction(undefined) in its existing finally block. Invalid forms must not show a spinner or disable controls.

- [x] Step 4: Make previous-step URL navigation action-aware.

Replace goToPreviousStep with:

```ts
async function goToPreviousStep() {
  if (pendingRef.current || activeStepNumber <= 1) return;

  pendingRef.current = true;
  setPendingAction("previous");
  try {
    clearErrors();
    await setQueryStep(activeStepNumber - 1);
  } finally {
    pendingRef.current = false;
    setPendingAction(undefined);
  }
}
```

Keep the existing caller as void controller.goToPreviousStep().

- [x] Step 5: Return pendingAction from the controller.

Retain isPending for the fieldset and add pendingAction to the returned controller object:

```ts
return {
  // existing properties
  isPending,
  pendingAction,
  // existing properties
};
```

- [x] Step 6: Run the focused page test as a compile checkpoint.

```sh
pnpm exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
```

Expected: the source compiles; the old status-text assertion will be updated in Task 3.

## Task 3: Render the spinner only in the active action

Files:

- Modify: $HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx
- Modify: $HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx

- [x] Step 1: Import the shared Spinner and pending-action type.

```tsx
import { Spinner } from "@/components/ui/spinner";
import type {
  E2eProfileFormPendingAction,
  E2eProfileMockMode,
} from "@/feature/e2e/types/e2e-profile-form.types";
```

Keep the existing dialog and button imports.

- [x] Step 2: Replace isPending in the action-bar props with pendingAction.

Use pendingAction?: E2eProfileFormPendingAction and derive:

```ts
const isPending = pendingAction !== undefined;
```

Keep aria-busy={isPending} on the action group. Delete the paragraph whose text is Saving profile….

- [x] Step 3: Add a decorative action-label helper.

```tsx
function ActionLabel({
  children,
  isLoading,
}: {
  children: React.ReactNode;
  isLoading: boolean;
}) {
  return (
    <>
      {isLoading && <Spinner aria-hidden="true" />}
      {children}
    </>
  );
}
```

The button text remains visible and aria-busy communicates the state.

- [x] Step 4: Apply the helper and per-button aria-busy.

For Previous, use:

```tsx
<Button
  type="button"
  variant="outline"
  disabled={isPending || currentStep <= 1}
  aria-busy={pendingAction === "previous"}
  onClick={onPrevious}
>
  <ActionLabel isLoading={pendingAction === "previous"}>
    Previous
  </ActionLabel>
</Button>
```

Apply the same pattern to Continue with the continue value and Validate and finish with the finalize value. Keep the mock button disabled while pending but do not render a spinner in it.

- [x] Step 5: Update direct action-bar assertions.

In profile-form-page.test.tsx, replace isPending={false} with pendingAction={undefined} and the pending fixture’s isPending prop with pendingAction="finalize".

Assert:

```ts
expect(screen.queryByText("Saving profile…")).not.toBeInTheDocument();
const finalizeButton = screen.getByRole("button", {
  name: "Validate and finish",
});
expect(finalizeButton).toHaveAttribute("aria-busy", "true");
expect(finalizeButton.querySelector('[data-slot="spinner"]')).not.toBeNull();
expect(
  screen.getByRole("button", { name: "Previous" }),
).not.toHaveAttribute("aria-busy", "true");
```

Retain the assertions that the confirmation action is present, every action is disabled, and the action group has aria-busy="true".

- [x] Step 6: Run the action-bar tests.

```sh
pnpm exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx -t "E2eProfileFormActions"
```

Expected: PASS with no Saving profile… status rendered.

## Task 4: Keep final navigation pending

Files:

- Modify: $HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-route.tsx
- Modify: $HOME/Documents/Programming/mihc/nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx
- Modify: $HOME/Documents/Programming/mihc/nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx

- [x] Step 1: Track final route transition in the route wrapper.

Import useTransition and use this shape, preserving the existing destination:

```tsx
const [isNavigating, startTransition] = useTransition();

function handleFinish(profileId: string) {
  startTransition(() => {
    router.push(
      "/e2e-testing?" +
        profileParamKey +
        "=" +
        encodeURIComponent(profileId),
    );
  });
}

return (
  <E2eProfileFormPage
    {...props}
    isNavigating={isNavigating}
    onFinish={handleFinish}
  />
);
```

- [x] Step 2: Add the optional route-pending prop to the page base props.

```ts
isNavigating?: boolean;
```

Destructure it in E2eProfileFormPage with a default of false so direct page tests remain unchanged.

- [x] Step 3: Combine route and controller state before rendering.

```ts
const isPending = controller.isPending || isNavigating;
const pendingAction = isNavigating
  ? "finalize"
  : controller.pendingAction;
```

Use isPending for the fieldset disabled prop and pass pendingAction to E2eProfileFormActions. Keep onChangeCapture={controller.blockPendingFieldChange}.

- [x] Step 4: Assert the active Continue button while a draft is unresolved.

In the existing duplicate-submission test, after the first Continue click and before resolving the deferred draft, add:

```ts
expect(continueButton).toHaveAttribute("aria-busy", "true");
expect(continueButton.querySelector('[data-slot="spinner"]')).not.toBeNull();
expect(screen.queryByText("Saving profile…")).not.toBeInTheDocument();
```

After resolving the promise, retain the enabled-button assertion and add:

```ts
expect(continueButton).not.toHaveAttribute("aria-busy", "true");
```

- [x] Step 5: Add a deferred finalization assertion if no existing test observes unresolved finalization.

Use a deferred FinalizeE2eProfileForm, render the confirmation step with a valid existing profile, click Validate and finish, and assert that only that button has aria-busy="true" and a data-slot="spinner" while unresolved. Resolve with a successful result containing profileId existing-profile and assert the button becomes enabled.

- [x] Step 6: Run both focused profile-form test files.

```sh
pnpm exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx __tests__/unit/feature/e2e/profile-form/profile-form-navigation.test.tsx
```

Expected: PASS, with no Saving profile… expectation remaining.

## Task 5: Verify the scoped change

- [x] Step 1: Run lint from $HOME/Documents/Programming/mihc/nextjs/.

```sh
pnpm lint
```

Expected: PASS, or report only failures proven to predate this change.

- [x] Step 2: Run typecheck.

```sh
pnpm exec tsc --noEmit
```

Expected: PASS, or report only pre-existing failures with exact paths.

- [x] Step 3: Check whitespace, the focused diff, and status from $HOME/Documents/Programming/mihc/.

```sh
git diff --check
git diff -- nextjs/feature/e2e/components/profile-form/e2e-profile-form-actions.tsx nextjs/feature/e2e/components/profile-form/e2e-profile-form-page.tsx nextjs/feature/e2e/components/profile-form/e2e-profile-form-route.tsx nextjs/feature/e2e/components/profile-form/use-e2e-profile-form-controller.tsx nextjs/feature/e2e/types/e2e-profile-form.types.ts nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
git status --short
```

Expected: only the loading-state implementation files are changed by this task; the pre-existing profile-mocking modifications remain present and no unrelated files are added.

- [x] Step 4: Report exact verification results and changed files.

Do not stage or commit the implementation unless the user explicitly requests a commit. The design document commit already exists separately as 4549601.




