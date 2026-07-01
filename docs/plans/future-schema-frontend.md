# Future-Schema Frontend Plan

## Goal

Revamp the MMDC maintainer console around schema-aligned frontend contracts and local run simulations without changing backend, persistence, or authentication code.

## Implementation

1. Replace legacy mock types and display strings with nested view contracts, ISO timestamps, numeric durations, fixtures, and pure summary selectors.
2. Rebuild Smoke Testing around derived app summaries, three-way filtering, run numbers, audit identities, and a test-diagnostics side panel.
3. Rebuild E2E Testing around profile enrollment inspection, sequential prefix selection, automated/manual local sessions, run history, and nested assertion diagnostics.
4. Standardize status treatments and empty states, then clarify fixture mode on Settings.
5. Validate lint, typecheck, production build, responsive layouts, keyboard flows, and the final diff.

## Constraints

- Do not modify Drizzle, better-auth, APIs, server actions, repositories, migrations, or persistence files.
- Preserve all pre-existing uncommitted work.
- Do not introduce TanStack Query until a real backend boundary exists.
- E2E runs must include Step 1 and may exclude only trailing configured steps; active manual run selection is immutable.

## Verification

- Exercise each smoke and E2E status represented by fixtures.
- Verify filters, all valid sequential E2E ranges, blocked gap selections, local manual runs, automated runs, run numbering, side-panel navigation, empty states, and narrow-screen overflow.
- Run `just lint`, `just typecheck`, and `just build`.
- Confirm the final diff contains only intentional documentation and frontend changes plus the user's existing work.
