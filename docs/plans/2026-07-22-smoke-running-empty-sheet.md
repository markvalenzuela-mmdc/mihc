# Running Smoke Sheet Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display an inline loading indicator when a selected Smoke run is running and has no observed test results yet.

**Architecture:** Extend the existing Smoke details component with one conditional empty state using the shared Spinner component. Keep the query, polling, persistence, status, metrics, and existing result-card rendering unchanged.

**Tech Stack:** React 19, TypeScript, shared shadcn Spinner, Vitest, Testing Library

**Execution constraint:** Preserve Mode 3: leave implementation and plan changes uncommitted for review.

---

### Task 1: Add the running-empty Sheet state

**Files:**
- Modify: `nextjs/__tests__/unit/feature/smoke/smoke-active-state.test.tsx`
- Modify: `nextjs/feature/smoke/components/smoke-run-details.tsx`

- [ ] **Step 1: Add failing component assertions**

Cover all three branches:

```tsx
expect(screen.getByText("Waiting for test results…")).toBeVisible();
expect(screen.getByRole("status", { name: "Loading" })).toBeVisible();
expect(screen.queryByText("Waiting for test results…")).not.toBeInTheDocument();
```

The message must appear for `status: "running"` with `results: []`, disappear when a running result exists, and remain absent for a terminal empty run.

- [ ] **Step 2: Run the focused test and confirm the missing state fails**

Run: `pnpm test -- __tests__/unit/feature/smoke/smoke-active-state.test.tsx`

Expected: the running-empty assertion fails because no message or spinner is rendered.

- [ ] **Step 3: Add the minimal conditional UI**

Import the shared `Spinner` and render this only when `details.status === "running" && results.length === 0`:

```tsx
<div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
  <Spinner />
  <p>Waiting for test results…</p>
</div>
```

Leave the existing `results.map(...)` block unchanged.

- [ ] **Step 4: Run focused and static verification**

Run from `nextjs/`:

```text
pnpm test -- __tests__/unit/feature/smoke/smoke-active-state.test.tsx
pnpm exec tsc --noEmit
pnpm exec eslint feature/smoke/components/smoke-run-details.tsx __tests__/unit/feature/smoke/smoke-active-state.test.tsx
```

Expected: all commands pass.

- [ ] **Step 5: Audit scope**

Run `git diff --check` and confirm this follow-up changes only the details component, its focused test, and planning documentation. Do not commit implementation changes.
