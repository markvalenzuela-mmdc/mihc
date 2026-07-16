# BetterAuth seeded development user

## Context

The phase-2 login form now calls BetterAuth, but the existing database seed only
creates application and profile data. A fresh local database therefore has no
credential account that can authenticate through the login form.

## Decision

Extend the existing `pnpm db:seed` flow with an idempotent BetterAuth-backed
development user:

- Email: `maintainer@example.com`
- Password: `password123`
- Display name: `Maintainer`

The seed will use BetterAuth's server sign-up API so password hashing and the
credential account shape remain owned by BetterAuth. If the email already
exists, the seed will leave that account unchanged and report that it was
already present. Existing seeded operator, application, smoke-test, and profile
data remain unchanged.

The seed output and local setup documentation will identify the development
credentials. These credentials are for local development only and must not be
used as production credentials.

## Alternatives considered

### Direct BetterAuth API (selected)

Call BetterAuth's server `signUpEmail` endpoint from the seed process. This
keeps account creation and password hashing aligned with the installed
BetterAuth version and avoids duplicating credential-storage details.

### Direct Drizzle writes

Write the BetterAuth `user` and `account` rows directly. This would offer a
stable user ID, but would duplicate BetterAuth's password and account creation
logic and increase upgrade risk.

### One-off manual setup script

Create a separate script for the development user. This would avoid changing
the normal seed flow, but a reset or fresh environment would require an extra
manual step and could leave the application without usable credentials.

## Acceptance criteria

1. `pnpm db:seed` creates the development user when it is absent.
2. The created user can log in through the root login form with the credentials
   above and is redirected to `/smoke-testing`.
3. Re-running the seed does not fail because the user already exists.
4. Existing operator and application seed behavior remains intact.
5. The seed command reports the result without printing password hashes or other
   secrets.
6. Typecheck, focused tests, lint, and `git diff --check` are run; unrelated
   pre-existing test failures are reported separately.

## Scope boundaries

- No production default credentials are introduced.
- No signup UI or password-reset flow is added.
- No existing authentication schema or migration is rewritten.
