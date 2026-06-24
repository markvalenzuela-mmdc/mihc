# Agent Instructions

This is a multi-project monorepo. Each sub-project has its own agent instructions.
Read the relevant file before making changes in that directory.

## Projects

### nextjs/

Read `nextjs/AGENTS.md` before editing anything in `nextjs/`.
That file contains Next.js-specific rules and version caveats.

### playwright/

*(No agent instructions yet — create `playwright/AGENTS.md` when the project is set up.)*

### docker/

*(No agent instructions yet — create `docker/AGENTS.md` when the project is set up.)*

## Cross-cutting

- Root commands are managed via `justfile`. Run `just` to see available commands.
- For justfile conventions, read `docs/justfile-conventions.md`.
