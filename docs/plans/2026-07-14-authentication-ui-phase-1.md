# Authentication UI Phase 1 Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with review checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a frontend-only login page at `/` and a presentational account/logout menu in the dashboard sidebar without invoking BetterAuth or changing authentication behavior.

**Architecture:** Keep the root page as a server route that renders a focused client login form from `app/_components`. Replace the root redirect only for phase 1; leave `/smoke-testing` and existing BetterAuth infrastructure unchanged. Extend the existing client `AppShell` with a `SidebarFooter` account trigger backed by the existing avatar and dropdown primitives.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, existing Base UI/shadcn primitives, Vitest, and Testing Library.

---

## Existing context and boundaries

- The root route is `nextjs/app/page.tsx` and currently redirects to
  `/smoke-testing`.
- The dashboard shell is `nextjs/components/app-shell.tsx`.
- Existing primitives are available in `nextjs/components/ui/` for `Card`,
  `Field`, `Input`, `Button`, `Avatar`, `DropdownMenu`, and sidebar layout.
- BetterAuth helpers already exist under `nextjs/lib/better-auth/`, but phase 1
  must not import or call them.
- The worktree contains unrelated user-owned changes. Only the files listed in
  this plan may be added or modified for this feature.
- The repository uses Vitest with a jsdom environment and Testing Library; run
  commands from `nextjs/` with pnpm.

## Task 1: Add the failing login-form tests

**Files:**

- Create: `nextjs/__tests__/unit/app/login-form.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
import {
  createEvent,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoginForm } from "@/app/_components/login-form";

describe("LoginForm", () => {
  it("renders the labeled email and password controls", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("heading", { name: "Sign in to MMDC Testing" }),
    ).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute(
      "type",
      "email",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
  });

  it("prevents navigation when the frontend-only form is submitted", () => {
    render(<LoginForm />);

    const form = screen.getByRole("form", { name: "Log in" });
    const submitEvent = createEvent.submit(form);

    fireEvent(form, submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
  });
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```powershell
pnpm exec vitest run __tests__/unit/app/login-form.test.tsx
```

Expected: FAIL because `nextjs/app/_components/login-form.tsx` does not yet
exist.

## Task 2: Implement the root login surface

**Files:**

- Create: `nextjs/app/_components/login-form.tsx`
- Modify: `nextjs/app/page.tsx`

- [ ] **Step 1: Add the client-only, non-functional login form**

Create `nextjs/app/_components/login-form.tsx` with this implementation:

```tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-sm font-medium text-primary">MMDC Testing</p>
          <CardTitle>
            <h1>Sign in to MMDC Testing</h1>
          </CardTitle>
          <CardDescription>
            Sign in to continue to the maintainer console.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            aria-label="Log in"
            className="flex flex-col gap-6"
            onSubmit={(event) => event.preventDefault()}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </Field>
            </FieldGroup>
            <Button type="submit" className="w-full">
              Log in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
```

The component must not import `authClient`, `getCurrentUser`, `redirect`, or
any router API. The submit handler only prevents the browser default.

- [ ] **Step 2: Replace the root redirect with the login surface**

Replace all contents of `nextjs/app/page.tsx` with:

```tsx
import { LoginForm } from "./_components/login-form";

export default function Home() {
  return <LoginForm />;
}
```

- [ ] **Step 3: Run the focused login tests**

Run:

```powershell
pnpm exec vitest run __tests__/unit/app/login-form.test.tsx
```

Expected: PASS with two tests.

## Task 3: Add the failing sidebar account-menu test

**Files:**

- Create: `nextjs/__tests__/unit/components/app-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/smoke-testing",
}));

import { AppShell } from "@/components/app-shell";

describe("AppShell account menu", () => {
  it("shows the placeholder account and logout action in the sidebar footer", async () => {
    render(
      <AppShell>
        <div>Smoke testing content</div>
      </AppShell>,
    );

    expect(screen.getByText("Maintainer")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Maintainer/ }));

    expect(
      await screen.findByRole("menuitem", { name: "Log out" }),
    ).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the focused shell test to verify it fails**

Run:

```powershell
pnpm exec vitest run __tests__/unit/components/app-shell.test.tsx
```

Expected: FAIL because the sidebar has no account trigger or `Log out` menu
item yet.

## Task 4: Add the sidebar footer account menu

**Files:**

- Modify: `nextjs/components/app-shell.tsx`

- [ ] **Step 1: Add the required imports**

Add `LogOutIcon` to the existing `lucide-react` import, then add:

```tsx
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
```

Add `SidebarFooter` to the existing sidebar import.

- [ ] **Step 2: Insert the footer after `SidebarContent`**

Inside `Sidebar`, after the closing `</SidebarContent>` and before
`</Sidebar>`, add:

```tsx
        <SidebarFooter className="border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <SidebarMenuButton
                size="lg"
                tooltip="Account"
                className="group-data-[collapsible=icon]:justify-center"
              >
                <Avatar size="sm">
                  <AvatarFallback>M</AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">Maintainer</span>
                  <span className="truncate text-sidebar-foreground/60">
                    Account
                  </span>
                </span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start">
              <DropdownMenuItem variant="destructive">
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
```

Do not add an `onClick`, `onSelect`, server action, router call, or BetterAuth
import to the `Log out` item. The existing menu behavior may close the menu
after selection, but it must not otherwise change application state.

- [ ] **Step 3: Run the focused shell and login tests**

Run:

```powershell
pnpm exec vitest run __tests__/unit/app/login-form.test.tsx __tests__/unit/components/app-shell.test.tsx
```

Expected: PASS with three tests.

## Task 5: Run the phase-1 verification suite

**Files:** None beyond the files already listed above.

- [ ] **Step 1: Run the complete Next.js test suite**

Run from `nextjs/`:

```powershell
pnpm test
```

Expected: PASS. If an unrelated pre-existing test fails, record its exact
failure without modifying unrelated work.

- [ ] **Step 2: Run TypeScript validation**

Run:

```powershell
pnpm exec tsc --noEmit --types vitest/globals
```

Expected: PASS with no new type errors.

- [ ] **Step 3: Run lint**

Run:

```powershell
pnpm lint
```

Expected: PASS. Fix only lint issues caused by the phase-1 files.

- [ ] **Step 4: Run the repository diff check**

From the repository root, run:

```powershell
git diff --check
```

Expected: no output. This check must not modify or stage any unrelated
worktree changes.

## Task 6: Final scope audit and handoff

- [ ] **Step 1: Inspect the feature diff**

Run:

```powershell
git diff -- nextjs/app/page.tsx nextjs/app/_components/login-form.tsx nextjs/components/app-shell.tsx nextjs/__tests__/unit/app/login-form.test.tsx nextjs/__tests__/unit/components/app-shell.test.tsx
```

Confirm the diff contains only the root login UI, sidebar account menu, and
their focused tests. Confirm there are no BetterAuth calls, session reads,
middleware changes, redirects, mock sessions, or changes to `/smoke-testing`.

- [ ] **Step 2: Confirm worktree preservation**

Run:

```powershell
git status --short
```

Confirm all pre-existing modified and untracked paths remain present and
unchanged outside the feature files.

- [ ] **Step 3: Commit only the phase-1 files if a commit is requested**

If committing at handoff, stage only these paths:

```powershell
git add -- app/page.tsx app/_components/login-form.tsx components/app-shell.tsx __tests__/unit/app/login-form.test.tsx __tests__/unit/components/app-shell.test.tsx
```

Run from `nextjs/` and commit with:

```powershell
git commit -m "feat(auth): add frontend login and sidebar logout UI"
```

Do not stage or commit the pre-existing worktree changes.

