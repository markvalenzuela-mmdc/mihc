# MMDC Testing Dashboard

This is the Next.js App Router application for profile management, smoke-test
operations, and the E2E workspace. It consumes the shared
`@mihc/enrollmate-contract` package for the canonical EnrollMate definition,
validators, and reusable option sets.

## Development

From `nextjs/`:

```powershell
npx --yes pnpm@10.29.2 install
npx --yes pnpm@10.29.2 dev
```

Open `http://localhost:3000`.

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

## Validation commands

```powershell
npx --yes pnpm@10.29.2 test
npx --yes pnpm@10.29.2 exec tsc --noEmit --types vitest/globals
npx --yes pnpm@10.29.2 lint
```

Tests are organized under `__tests__/unit` and `__tests__/integration`.
Unit tests do not require a database; integration tests use the configured
test database helpers.

## Shared EnrollMate contract

The source of truth is:

```text
packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json
```

Import the package rather than importing that JSON directly:

```ts
import {
  getEnrollmateFlowDefinition,
  getEnrollmateReusableOptionSets,
  getEnrollmateValidator,
} from "@mihc/enrollmate-contract";
```

- `getEnrollmateFlowDefinition(flowType)` returns ordered steps, sections, and
  fields with resolved field options.
- `getEnrollmateReusableOptionSets()` returns every dynamically named reusable
  option set as a detached read-only record.
- `getEnrollmateValidator(flowType)` validates submitted form data.
- `getEnrollmateDefinitionHash()` is available from
  `@mihc/enrollmate-contract/server` for server-side version checks.

The package is declared as a local dependency in `package.json` and listed in
`next.config.ts` under `transpilePackages`. When the definition changes, run
the contract tests and typecheck before updating consumers.

## Repository architecture

- `app/` — App Router pages and API routes.
- `feature/e2e/` — profile workspace and E2E workflow services.
- `feature/smoke/` — smoke-test UI and services.
- `lib/drizzle/` — database schema, migrations, and seed code.
- `__tests__/unit/` — fast unit tests.
- `__tests__/integration/` — database/API integration tests.

The JSONB profile model stores flow documents in `profile_forms.data` and
internal sections in `profiles.operational_data`. The current implementation
and migration decisions are documented in
`docs/brainstorm/enrollmate-jsonb-profile-model.md` and
`docs/plans/2026-07-10-enrollmate-jsonb-profile-model.md`.

Read the repository `AGENTS.md`, this project’s `AGENTS.md`, and
`docs/README.md` before making changes.
