# Smoke Result Label Normalization

**Status:** Approved design
**Date:** 2026-07-22
**Related task:** Persist Smoke test runs incrementally from Hono

## Goal

Normalize labels and file paths for newly observed Smoke results without changing execution, persistence lifecycle, statuses, counters, timing, polling, or UI behavior.

## Write-time normalization

The incremental Playwright reporter will normalize fields immediately before calling the existing result-start persistence operation.

- Remove the leading `smoke:` marker from test titles.
- Convert route titles such as `/admissions/city-scholarships/` to `Admissions / City Scholarships`.
- Replace hyphens in prose titles and capitalize the resulting label while preserving existing uppercase acronyms such as `BSIT`.
- Convert absolute Playwright locations to forward-slash paths relative to the Playwright `tests/` directory, such as `smoke/landing.spec.ts`.

The formatter will be a pure, focused helper covered by unit tests. The persistence interfaces and database schema remain unchanged.

## Explicit non-goals

- Do not update or backfill existing rows.
- Do not add a compatibility or read-time formatting layer.
- Do not alter test source titles or test files.
- Do not change Smoke execution, result status, timing, counters, finalization, polling, APIs, or UI components.

## Verification

- Unit-test representative prose, route, acronym, and Windows/POSIX path inputs.
- Verify reporter lifecycle tests receive normalized fields.
- Run the Playwright server unit suite and typecheck.
