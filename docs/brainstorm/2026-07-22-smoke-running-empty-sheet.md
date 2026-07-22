# Running Smoke Sheet Empty State

**Status:** Approved design
**Date:** 2026-07-22

## Goal

Show clear activity in the Smoke run details Sheet while a run is active but has not yet persisted its first observed test.

## Design

Within the existing Test results section, render an inline spinner and the message `Waiting for test results…` only when both conditions are true:

- the selected run status is `running`;
- the result list is empty.

Keep the Sheet header, run status, metrics, duration, polling, and controls visible. As soon as the first result appears, render the existing result cards and remove the waiting indicator.

## Non-goals

- Do not show this indicator for terminal empty runs.
- Do not add a full-Sheet overlay or skeleton result cards.
- Do not change queries, polling, persistence, APIs, status handling, or result rendering.

## Verification

Add focused component coverage for running-empty, running-with-results, and terminal-empty states. Run the focused Smoke component tests, Next.js typecheck, and lint for the changed files.
