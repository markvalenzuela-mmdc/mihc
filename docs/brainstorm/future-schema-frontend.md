# Future-Schema Frontend — Brainstorm

## Context

The current testing dashboard uses flat, display-formatted mock data. The new database documentation introduces per-app and per-profile run numbers, three-level result hierarchies, enrollment data, audit identities, and additional run states. This phase prepares the frontend for that shape without adding backend behavior.

## Agreed Direction

- Keep the work frontend-only with synchronous local fixtures.
- Use frontend view contracts that mirror future query payloads instead of importing Drizzle row types.
- Preserve the existing shell and neutral design language while improving hierarchy, density, responsiveness, and diagnostics.
- Derive smoke summaries from run history rather than storing mock-only uptime or health fields.
- Keep profiles inside the E2E workflow and present enrollment details read-only.
- Retain automated and manual E2E modes. Each run snapshots a non-empty prefix of the ordered step sequence: Step 1 is required, and operators may remove only trailing steps.
- Use one wide contextual side panel for profile setup and run diagnostics rather than nested drawers.
- Keep Settings small and explicitly describe the local fixture mode.

## Rejected Approaches

- Direct Drizzle types: raw persistence rows do not match the nested payloads the UI consumes and would couple clients to storage details.
- A mock TanStack Query layer: cache and transport semantics are not defined yet, so this would create infrastructure without a real boundary.
- Dedicated profile management: create and edit workflows are outside this frontend-only migration.
- Inline nested result tables: a wide side panel keeps history lists scannable while giving diagnostics adequate room.
- Arbitrary step multi-select: allowing gaps or runs that begin after Step 1 would violate the sequential workflow. Constrained checkboxes move only the included/excluded boundary.

## Future Work

- Replace fixtures with server actions and TanStack Query hooks when backend contracts exist.
- Add authentication UI and operator sessions after better-auth backend wiring is complete.
- Define real run mutation, loading, error, retry, and cancellation behavior with the backend phase.
