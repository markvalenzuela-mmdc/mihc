# E2E Profile Progress Header Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current worktree. Steps use checkbox syntax for tracking.

**Goal:** Make the Create E2E Profile progress header readable and visually clear on desktop and narrow mobile screens without changing navigation behavior.

**Architecture:** Keep the existing contract-driven `E2eProfileFormProgress` component and its ordered-list semantics. Replace the horizontally scrolling card strip with one responsive progress surface: a four-column layout on larger screens and four full-width rows on small screens. The active step gets a visible `Current step` label; validated and upcoming states retain their existing marker semantics.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Vitest, Testing Library.

---

### Task 1: Update the responsive progress presentation

**Files:**

- Modify: `nextjs/feature/e2e/components/profile-form/e2e-profile-form-progress.tsx`

- [ ] **Step 1: Preserve the existing state contract**

Keep `activeStep`, `steps`, and `validatedSteps` unchanged. Continue deriving
`isActive`, `isValidated`, and `state` per step, and keep `aria-current="step"`
on the active `<li>`.

- [ ] **Step 2: Replace horizontal overflow with responsive layout classes**

Change the `<ol>` from a horizontally scrolling flex row to a responsive grid:

```tsx
<ol className="grid gap-2 sm:grid-cols-4 sm:gap-0 sm:divide-x sm:overflow-hidden sm:rounded-lg sm:border sm:bg-card">
```

Use mobile rows with readable wrapping and desktop columns inside the shared
surface:

```tsx
className={cn(
  "flex min-w-0 items-start gap-3 rounded-md border px-3 py-3 text-sm sm:rounded-none sm:border-0 sm:px-4 sm:py-4",
  isActive && "border-foreground bg-muted sm:bg-muted/80",
  isValidated && !isActive && "bg-muted/50",
  !isActive && !isValidated && "text-muted-foreground",
)}
```

Keep the marker compact and prevent it from shrinking. Keep the title in a
`min-w-0` wrapper so long labels wrap within the viewport instead of forcing
overflow.

- [ ] **Step 3: Make the active status visible**

Render the existing active-step announcement as a normal visible secondary
line below the active title, and remove the duplicate screen-reader-only
`Current step` span:

```tsx
{isActive && (
  <span className="mt-1 block text-xs font-normal text-muted-foreground">
    Current step
  </span>
)}
```

Keep the validated screen-reader-only announcement and the existing marker
icon/number logic unchanged.

### Task 2: Verify the scoped UI change

**Files:**

- Test: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx`

- [ ] **Step 1: Run the focused page test**

Run:

```powershell
pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form/profile-form-page.test.tsx
```

Expected: the existing progress assertions pass, including the ordered list,
contract-derived titles, and `aria-current="step"` transitions.

- [ ] **Step 2: Run lint for the touched component**

Run:

```powershell
pnpm --dir nextjs exec eslint feature/e2e/components/profile-form/e2e-profile-form-progress.tsx
```

Expected: no lint errors.

- [ ] **Step 3: Review the final diff boundaries**

Run:

```powershell
git diff --check
git diff -- nextjs/feature/e2e/components/profile-form/e2e-profile-form-progress.tsx
git status --short
```

Expected: only the progress component contains implementation changes; all
pre-existing dirty files remain present and untouched.

- [ ] **Step 4: Manually inspect responsive behavior when the app is available**

Open the Create E2E Profile page at desktop width and a narrow mobile width.
Confirm all four labels are visible, the mobile layout does not scroll
horizontally, the active item shows `Current step`, and the header remains
display-only.
