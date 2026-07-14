# Auth Current User Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove the duplicate `nextjs/lib/better-auth/current-user.ts` helper and make every consumer use `getCurrentUser` from `nextjs/feature/auth/actions/auth.action.ts`.

**Architecture:** Keep the existing `auth.action.ts` implementation as the single source for reading the Better Auth session. Update production consumers and their Vitest module mocks to import that action directly, then delete the duplicate helper. Send a live migration notice to currently running Codex tasks without adding a persistent repository instruction.

**Tech Stack:** Next.js 16, TypeScript, Better Auth, Vitest, pnpm.

---

### Task 1: Replace duplicate helper imports

**Files:**
- Modify: `nextjs/feature/auth/actions/auth.action.ts`
- Modify: `nextjs/app/page.tsx`
- Modify: `nextjs/feature/auth/auth-guards.ts`
- Modify: `nextjs/__tests__/unit/app/page.test.tsx`
- Modify: `nextjs/__tests__/unit/feature/auth/auth-guards.test.ts`
- Modify: `nextjs/__tests__/unit/feature/e2e/e2e-profile-form.action.test.ts`
- Delete: `nextjs/lib/better-auth/current-user.ts`

- [x] **Step 1: Change production imports**

Move the `AuthSession`/`CurrentUser` type definitions into the canonical action module and keep the function contract explicit:

```ts
type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export type CurrentUser = NonNullable<AuthSession>["user"];

export async function getCurrentUser(): Promise<CurrentUser | null> {
```

Then replace each production import of `@/lib/better-auth/current-user` with:

```ts
import { getCurrentUser } from "@/feature/auth/actions/auth.action";
```

- [x] **Step 2: Change test mocks**

Replace each test mock module path `@/lib/better-auth/current-user` with `@/feature/auth/actions/auth.action`, keeping the existing `getCurrentUser` mock function and test behavior unchanged.

- [x] **Step 3: Remove the duplicate helper**

Delete `nextjs/lib/better-auth/current-user.ts`; do not add a compatibility re-export.

### Task 2: Notify active Codex tasks

**Files:** None.

- [x] **Step 1: List currently running Codex tasks**

Use the Codex task list and identify tasks whose status is currently running.

- [x] **Step 2: Send the migration notice**

Send each running task this message:

> `Auth current-user consolidation: do not recreate or reintroduce nextjs/lib/better-auth/current-user.ts. Use getCurrentUser from nextjs/feature/auth/actions/auth.action.ts for all current-user lookups and test mocks.`

### Task 3: Verify the consolidation

**Files:** None.

- [x] **Step 1: Confirm no stale references remain**

Run:

```powershell
rg -n --hidden --glob '!node_modules' --glob '!nextjs/.next' "@/lib/better-auth/current-user|lib/better-auth/current-user|current-user\.ts" nextjs
```

Expected: no output.

- [x] **Step 2: Run focused tests**

Run the existing page, auth-guard, and E2E action unit tests through the Next.js package’s test command. Expected: all selected tests pass.

- [x] **Step 3: Inspect the final diff**

Run `git diff --check` and `git diff`; confirm only the approved imports, test mock paths, helper deletion, and plan file changed, while all pre-existing user-owned changes remain intact.
