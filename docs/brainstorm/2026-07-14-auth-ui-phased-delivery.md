# Authentication UI Phased Delivery

**Date:** 2026-07-14
**Status:** Approved for phase 1 implementation

## Context

The Next.js application is a maintainer dashboard with an existing
`/smoke-testing` page and an existing BetterAuth server/client setup. The root
route currently redirects to `/smoke-testing`. The requested authentication
work is intentionally split into two phases:

- Phase 1 builds the frontend login and logout surfaces only.
- Phase 2 connects those surfaces to BetterAuth and implements session-aware
  redirects and protected-route gating after explicit approval.

The worktree already contains unrelated user-owned changes, including BetterAuth
route/configuration work and E2E profile-form work. Those changes must be
preserved.

## Decisions

### Route and page structure

The login surface will live at the root route (`/`) as a route-local UI. During
phase 1, every visitor sees the login page at `/`; no session is read and no
redirect is performed. The existing `/smoke-testing` page remains the post-login
destination for manual preview and is not gated during phase 1.

In phase 2, the root route is expected to become the auth-aware entry point:

- authenticated users go to `/smoke-testing`;
- unauthenticated users remain at or are redirected to `/` when accessing
  protected pages.

The exact protected-route set and BetterAuth redirect implementation are
deferred to the phase-2 design/implementation review.

### Login form

The page uses a centered, standalone card and the existing UI primitives. It
contains:

- an email input with an accessible label and native email/required behavior;
- a password input with an accessible label and native required behavior;
- a primary `Log in` submit button.

The form submission is intentionally non-functional in phase 1. It prevents
navigation, makes no network request, does not import or call BetterAuth, and
does not create mock session state. Signup, password recovery, and other
account flows are out of scope.

### Sidebar account control

The existing dashboard shell will gain a sidebar footer control. The footer is
placed at the bottom of the sidebar and contains:

- a compact avatar with `M` initials;
- the placeholder display name `Maintainer` while no authenticated user is
  available;
- a menu opened by the avatar/name control;
- a destructive `Log out` menu item.

The menu is presentational in phase 1. Selecting `Log out` does not call
BetterAuth, clear state, or navigate. Phase 2 will replace the placeholder
identity with the authenticated user and connect the menu item to BetterAuth
sign-out behavior.

### Existing components and styling

The implementation will reuse the current `Card`, `Field`, `Input`, `Button`,
`Avatar`, `DropdownMenu`, and sidebar primitives. It will match the existing
dark dashboard theme and responsive layout without adding a new styling system
or dependency.

## Alternatives considered

1. **Route-local root login page — selected.** This is the smallest change,
   keeps the phase boundary clear, and leaves the eventual auth-aware root
   behavior easy to add.
2. **Shared authentication layout.** This would prepare for signup and
   password recovery, but introduces structure not required by the current
   request.
3. **Client-side mock session.** This would preview redirects, but risks being
   confused with real authentication and violates the requested frontend-only
   boundary.

The existing dashboard shell was also considered for the login page and
rejected in favor of the explicitly requested standalone card.

## Planned implementation units

- `nextjs/app/page.tsx`: render the root login page instead of redirecting.
- `nextjs/app/_components/login-form.tsx`: own the client-side,
  non-functional login form presentation and submit prevention.
- `nextjs/components/app-shell.tsx`: add the sidebar footer account menu.
- `nextjs/__tests__/unit/app/login-form.test.tsx`: verify fields, accessible
  labels, and non-navigating submit behavior.
- `nextjs/__tests__/unit/components/app-shell.test.tsx`: verify the account
  control and logout menu presentation.

The test file locations may follow the closest existing test placement if the
current test organization makes a different route-local location more
consistent; no production behavior is changed by that choice.

## Validation and acceptance criteria

Phase 1 is complete when:

1. Opening `/` shows the centered login card.
2. The email and password controls are labeled and usable on desktop and
   mobile widths.
3. Submitting the form does not navigate, call BetterAuth, or show a fake
   success state.
4. The existing smoke-testing page remains available at `/smoke-testing`.
5. The sidebar footer shows the avatar/name control and its menu exposes
   `Log out`.
6. Selecting `Log out` has no auth or navigation effect in phase 1.
7. Focused tests, typecheck, lint, and `git diff --check` pass.
8. No existing user-owned changes are removed or rewritten.

## Deferred questions for phase 2

- Which dashboard routes besides `/smoke-testing` and `/e2e-testing` require
  authentication?
- What user field should supply the sidebar display name and avatar fallback?
- Should failed BetterAuth login show an inline field/form error or a toast?
- Should successful login preserve an originally requested protected URL, or
  always redirect to `/smoke-testing`?
