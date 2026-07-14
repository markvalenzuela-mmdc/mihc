# BetterAuth Seeded Development User Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with review checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing local database seed create an idempotent BetterAuth credential user that can log in to the dashboard.

**Architecture:** Add a small seed module responsible only for the local development credential. It checks the BetterAuth `user` table through the existing Drizzle seed connection, then dynamically loads the BetterAuth singleton and calls `auth.api.signUpEmail` only when the email is absent. Wire that helper into the existing seed before the application/profile transaction, leaving the current operator and fixture data unchanged.

**Tech Stack:** Next.js, TypeScript, BetterAuth 1.6, Drizzle ORM/PostgreSQL, Vitest, pnpm.

---

## Files and responsibilities

- Create `nextjs/lib/drizzle/seed/seed-auth.ts` — development credential constants and idempotent BetterAuth user creation.
- Modify `nextjs/lib/drizzle/seed.ts` — call the auth seed and print its status with the existing seed messages.
- Create `nextjs/__tests__/unit/lib/drizzle/seed/seed-auth.test.ts` — prove absent-user creation, existing-user no-op, and production safety without requiring PostgreSQL.
- Create `nextjs/__tests__/integration/auth-seed.test.ts` — use the existing test database setup to prove the seeded credential can authenticate through BetterAuth.
- Modify `nextjs/README.md` — document the local seed command and development login credentials.

## Task 1: Add unit coverage for the auth seed boundary

**Files:**
- Create: `nextjs/__tests__/unit/lib/drizzle/seed/seed-auth.test.ts`

- [ ] **Step 1: Add a fake Drizzle select chain and mock BetterAuth**

Create a test-local database double whose `select().from().where().limit()` chain resolves to a configurable user row. Mock `@/lib/better-auth/auth` with only `auth.api.signUpEmail`.

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
}));

vi.mock("@/lib/better-auth/auth", () => ({
  auth: { api: { signUpEmail: mocks.signUpEmail } },
}));

import {
  developmentAuthUser,
  seedAuthUser,
} from "@/lib/drizzle/seed/seed-auth";

function fakeDb(rows: Array<{ id: string }>) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));

  return {
    select: vi.fn(() => ({ from })),
  } as never;
}

describe("seedAuthUser", () => {
  beforeEach(() => {
    mocks.signUpEmail.mockReset();
    vi.unstubAllEnvs();
  });
```

- [ ] **Step 2: Write the absent-user test**

```ts
  it("creates the local BetterAuth user when the email is absent", async () => {
    mocks.signUpEmail.mockResolvedValue({
      user: { email: developmentAuthUser.email },
    });

    await expect(seedAuthUser(fakeDb([]))).resolves.toEqual([
      `Seeded auth user: ${developmentAuthUser.email}`,
      `Development login password: ${developmentAuthUser.password}`,
    ]);

    expect(mocks.signUpEmail).toHaveBeenCalledWith({
      body: developmentAuthUser,
      headers: expect.any(Headers),
    });
  });
```

- [ ] **Step 3: Write the existing-user and production tests**

```ts
  it("does not call BetterAuth when the email already exists", async () => {
    await expect(seedAuthUser(fakeDb([{ id: "existing-user" }]))).resolves.toEqual([
      `Auth user already exists: ${developmentAuthUser.email}`,
      `Development login password: ${developmentAuthUser.password}`,
    ]);

    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });

  it("skips the development credential in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(seedAuthUser(fakeDb([]))).resolves.toEqual([
      "Skipped development auth user seed in production.",
    ]);

    expect(mocks.signUpEmail).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the new unit test and verify it fails for the missing module**

Run from `nextjs/`:

```powershell
pnpm exec vitest run __tests__/unit/lib/drizzle/seed/seed-auth.test.ts
```

Expected: FAIL because `nextjs/lib/drizzle/seed/seed-auth.ts` does not exist yet.

## Task 2: Implement and wire the idempotent BetterAuth seed

**Files:**
- Create: `nextjs/lib/drizzle/seed/seed-auth.ts`
- Modify: `nextjs/lib/drizzle/seed.ts`
- Test: `nextjs/__tests__/unit/lib/drizzle/seed/seed-auth.test.ts`

- [ ] **Step 1: Add the development credential constants and seed helper**

Create `nextjs/lib/drizzle/seed/seed-auth.ts`:

```ts
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "../schema";
import { authUser } from "../schema";

export const developmentAuthUser = {
  name: "Maintainer",
  email: "maintainer@example.com",
  password: "password123",
} as const;

export async function seedAuthUser(
  db: NodePgDatabase<typeof schema>,
): Promise<string[]> {
  if (process.env.NODE_ENV === "production") {
    return ["Skipped development auth user seed in production."];
  }

  const [existingUser] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, developmentAuthUser.email))
    .limit(1);

  if (existingUser) {
    return [
      `Auth user already exists: ${developmentAuthUser.email}`,
      `Development login password: ${developmentAuthUser.password}`,
    ];
  }

  const { auth } = await import("@/lib/better-auth/auth");

  await auth.api.signUpEmail({
    body: developmentAuthUser,
    headers: new Headers({ host: "localhost" }),
  });

  return [
    `Seeded auth user: ${developmentAuthUser.email}`,
    `Development login password: ${developmentAuthUser.password}`,
  ];
}
```

The dynamic import is intentional: the test-database setup changes
`DATABASE_URL` immediately before calling `seedDatabase()`, so BetterAuth must
initialize after that change rather than binding to the application database at
module import time.

- [ ] **Step 2: Wire the helper into the existing seed entrypoint**

In `nextjs/lib/drizzle/seed.ts`, import `seedAuthUser` and call it before the
existing transaction:

```ts
import { seedAuthUser } from "./seed/seed-auth";
```

```ts
const authMessages = await seedAuthUser(seedDb);
successMessages.push(...authMessages);

await seedDb.transaction(async (tx) => {
```

Keep the existing operator, smoke-run, E2E-step, profile, and E2E-run calls in
their current order. Do not move or rewrite those seed modules.

- [ ] **Step 3: Run the unit test and verify it passes**

Run:

```powershell
pnpm exec vitest run __tests__/unit/lib/drizzle/seed/seed-auth.test.ts
```

Expected: PASS with three tests.

## Task 3: Document and prove real authentication against the test database

**Files:**
- Create: `nextjs/__tests__/integration/auth-seed.test.ts`
- Modify: `nextjs/README.md`

- [ ] **Step 1: Add an integration test using the existing database harness**

Create the integration test so the BetterAuth module is dynamically imported
after `useIntegrationTestDatabase()` has reset and seeded the test database:

```ts
import { describe, expect, it } from "vitest";

import { developmentAuthUser } from "@/lib/drizzle/seed/seed-auth";
import { useIntegrationTestDatabase } from "./helpers/test-db";

describe("seeded BetterAuth development user", () => {
  useIntegrationTestDatabase();

  it("can sign in with the documented local credentials", async () => {
    const { auth } = await import("@/lib/better-auth/auth");

    const result = await auth.api.signInEmail({
      body: {
        email: developmentAuthUser.email,
        password: developmentAuthUser.password,
      },
      headers: new Headers({ host: "localhost" }),
    });

    expect(result.user.email).toBe(developmentAuthUser.email);
  });
});
```

- [ ] **Step 2: Add local login instructions to the README**

After the existing development commands in `nextjs/README.md`, add:

```md
### Local login

After PostgreSQL is running and migrations have been applied, seed the local
database from `nextjs/`:

```powershell
pnpm db:seed
```

Use these development-only credentials at `http://localhost:3000/`:

- Email: `maintainer@example.com`
- Password: `password123`

The seed is safe to rerun and does not create this default account in
production.
```

- [ ] **Step 3: Run the focused integration test when the test database is available**

Run from `nextjs/`:

```powershell
pnpm exec vitest run __tests__/integration/auth-seed.test.ts
```

Expected with `TEST_DATABASE_URL` and local PostgreSQL configured: PASS. If the
database is unavailable, keep the test in place and report the environment
blocker separately from code failures.

## Task 4: Verify the complete change and preserve unrelated work

**Files:**
- Verify only: the files listed above and the pre-existing worktree changes.

- [ ] **Step 1: Run the auth seed unit and integration checks**

```powershell
pnpm exec vitest run __tests__/unit/lib/drizzle/seed/seed-auth.test.ts __tests__/integration/auth-seed.test.ts
```

- [ ] **Step 2: Run typecheck and scoped lint**

```powershell
pnpm exec tsc --noEmit --types vitest/globals
pnpm exec eslint lib/drizzle/seed.ts lib/drizzle/seed/seed-auth.ts __tests__/unit/lib/drizzle/seed/seed-auth.test.ts __tests__/integration/auth-seed.test.ts
```

Expected: typecheck succeeds; scoped lint has no errors. Existing unrelated
warnings or failures are recorded rather than folded into this change.

- [ ] **Step 3: Run the seed twice against the configured local database**

```powershell
pnpm db:seed
pnpm db:seed
```

Expected: the first run reports `Seeded auth user: maintainer@example.com` and
the development password; the second reports `Auth user already exists:
maintainer@example.com` and the same development password. Neither run prints
a password hash or fails on the existing user.

- [ ] **Step 4: Check the final diff**

```powershell
git diff --check
git status --short
git diff -- nextjs/lib/drizzle/seed.ts nextjs/lib/drizzle/seed/seed-auth.ts nextjs/__tests__/unit/lib/drizzle/seed/seed-auth.test.ts nextjs/__tests__/integration/auth-seed.test.ts nextjs/README.md
```

Confirm that the requested seed, documentation, and tests are present and all
pre-existing user-owned changes remain untouched.

- [ ] **Step 5: Commit only the scoped implementation files**

```powershell
git add -- nextjs/lib/drizzle/seed.ts nextjs/lib/drizzle/seed/seed-auth.ts nextjs/__tests__/unit/lib/drizzle/seed/seed-auth.test.ts nextjs/__tests__/integration/auth-seed.test.ts nextjs/README.md
git commit -m "feat(auth): seed local development user"
```
