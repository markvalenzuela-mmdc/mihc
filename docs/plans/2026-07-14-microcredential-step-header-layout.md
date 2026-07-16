# Microcredential Step Header Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use the execution-plan workflow to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the E2E profile progress header allocate equal desktop width to the actual number of steps, including all three Microcredential steps.

**Architecture:** Keep the existing progress component and responsive behavior. Replace its fixed four-column desktop grid with CSS Grid auto-flow and equal-width auto columns, so the rendered step list determines the number of equal columns.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library.

---

### Task 1: Add a focused progress-header regression test

**Files:**
- Create: `nextjs/__tests__/unit/feature/e2e/profile-form/e2e-profile-form-progress.test.tsx`

- [ ] **Step 1: Add a component test for the responsive grid classes**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { E2eProfileFormProgress } from "@/feature/e2e/components/profile-form/e2e-profile-form-progress";

describe("E2eProfileFormProgress", () => {
  it("uses equal auto columns for the number of rendered desktop steps", () => {
    render(
      <E2eProfileFormProgress
        activeStep={3}
        steps={[
          { step: 1, title: "Profile" },
          { step: 2, title: "Details" },
          { step: 3, title: "Confirmation" },
        ]}
        validatedSteps={new Set([1, 2])}
      />,
    );

    const progressList = screen.getByRole("list");

    expect(progressList).toHaveClass("sm:grid-flow-col", "sm:auto-cols-fr");
    expect(progressList).not.toHaveClass("sm:grid-cols-4");
    expect(progressList.querySelectorAll(":scope > li")).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the focused test before the implementation**

Run:

```text
cd nextjs && pnpm exec vitest run __tests__/unit/feature/e2e/profile-form/e2e-profile-form-progress.test.tsx
```

Expected: FAIL because the component currently still has `sm:grid-cols-4` and lacks the equal auto-column classes.

### Task 2: Make the progress header width itself from the rendered steps

**Files:**
- Modify: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-progress.tsx:23`

- [ ] **Step 1: Replace the fixed desktop column class**

Change the ordered-list class from:

```tsx
className="grid gap-2 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:overflow-hidden sm:rounded-lg sm:border sm:bg-card"
```

to:

```tsx
className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr sm:gap-0 sm:divide-x sm:overflow-hidden sm:rounded-lg sm:border sm:bg-card"
```

Keep the base `grid` class unchanged so the existing stacked mobile layout remains intact.

- [ ] **Step 2: Run the focused regression test**

Run:

```text
cd nextjs && pnpm exec vitest run __tests__/unit/feature/e2e/profile-form/e2e-profile-form-progress.test.tsx
```

Expected: PASS.

### Task 3: Verify the scoped change and repository health

**Files:**
- Verify: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-progress.tsx`
- Verify: `nextjs/__tests__/unit/feature/e2e/profile-form/e2e-profile-form-progress.test.tsx`

- [ ] **Step 1: Run the related profile-form test suite**

Run:

```text
cd nextjs && pnpm exec vitest run __tests__/unit/feature/e2e/profile-form
```

Expected: PASS; report any failure unrelated to the progress component as pre-existing.

- [ ] **Step 2: Run lint and typecheck**

Run:

```text
cd nextjs && pnpm run lint
cd .. && npx tsc --noEmit -p nextjs/tsconfig.json
```

Expected: PASS.

- [ ] **Step 3: Inspect the final diff and whitespace**

Run:

```text
git diff -- nextjs/feature/e2e/components/profile-form/e2e-profile-form-progress.tsx nextjs/__tests__/unit/feature/e2e/profile-form/e2e-profile-form-progress.test.tsx
git diff --check
```

Expected: only the progress layout change and its focused test are introduced; existing user-owned changes remain untouched and no whitespace errors are reported.
