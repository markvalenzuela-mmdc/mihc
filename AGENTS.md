# Agent Instructions

This is a multi-project monorepo. Each sub-project has its own agent instructions.
Read the relevant file before making changes in that directory.

## Projects

### nextjs/

Read `nextjs/AGENTS.md` before editing anything in `nextjs/`.
That file contains Next.js-specific rules and version caveats.

### playwright/

Read `playwright/AGENTS.md` before editing anything in `playwright/`.
That file covers the smoke/e2e test layout, the JSON results schema, and how
runs report automated vs. manual mode.

### docker/

*(No agent instructions yet — create `docker/AGENTS.md` when the project is set up.)*

## Cross-cutting

- Root commands are managed via `justfile`. Run `just` to see available commands.
- For justfile conventions, read `docs/justfile-conventions.md`.
- Read `docs/README.md` before making cross-project changes. It maps current
  source-of-truth files, test boundaries, package usage, and historical docs.
- The EnrollMate source of truth is the shared
  `packages/enrollmate-contract/` package. Do not recreate its definition or
  reusable options under `nextjs/` or `playwright/`.
