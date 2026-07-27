# Modular Just convention

## Context

MIHC's root `justfile` currently mixes Next.js, database, Docker, Playwright,
and aggregate recipes. The approved convention uses a small root dispatcher
and domain modules under `commands/`, matching `agentic-workflow` and the
markdown2share implementation.

## Decision

- `dev` owns the normal development server, Next.js tests, and the fresh
  development flow. Its default recipe starts the server so `just dev`
  remains the normal entrypoint.
- `app` owns setup and production build commands.
- `db` owns generation, migration, seed, and destructive reset commands.
- `check` owns lint, typecheck, and aggregate verification commands.
- `docker` owns the existing local, build, project-wide down, and deploy
  Compose workflows.
- `playwright` owns smoke, E2E, server unit-test, and consumer-server commands.

The root `justfile` only declares these modules and privately delegates its
default output to `just --list --list-submodules --unsorted`. Existing recipe
bodies and the database reset confirmation remain behaviorally unchanged.
Old top-level aliases are not retained.

## Rejected alternatives

- Keep compatibility aliases: rejected because the requested public surface is
  fully namespaced except for the intentional `just dev` module default.
- Put every Next.js command under one namespace: rejected because it would not
  support the required `just dev test` and would mix lifecycle and checks.
- Rewrite recipe behavior while moving it: rejected because this change is
  structural, not a workflow redesign.

## Validation

- Compare the primary README command table with
  `just --summary --list-submodules`.
- Search live documentation, excluding historical brainstorms and plans, for
  obsolete top-level commands.
- List each module and dry-run representative commands.
- Show, but do not execute, destructive and deployment recipes.
- Inspect the final diff for unrelated changes.

## Historical records

Existing brainstorms and plans are immutable audit records. Their command
examples describe the repository at the time they were written and do not
override the live command sources named in `docs/README.md`.
