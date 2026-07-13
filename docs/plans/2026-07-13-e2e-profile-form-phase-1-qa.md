# E2E Profile Form Phase 1 QA

**Date:** 2026-07-13
**Branch:** `feat/86d3n6kxm-2`
**Route:** `/e2e-testing/profiles/new`
**Status:** Implementation verification passed; user UX acceptance pending

## Automated verification

| Check | Result |
| --- | --- |
| `pnpm --dir playwright test:unit` | Passed: 29 tests |
| `pnpm --dir playwright typecheck` | Passed with no diagnostics |
| `pnpm --dir nextjs exec vitest run __tests__/unit/feature/e2e/profile-form` | Passed: 59 tests across 4 files |
| `pnpm --dir nextjs exec tsc --noEmit` | Passed with no diagnostics |
| `pnpm --dir nextjs lint` | Passed: 0 errors, 17 pre-existing warnings outside the profile-form implementation |
| `git diff --check` | Passed |

Vitest printed two Node warnings that `--localstorage-file` did not have a
valid path. They did not affect the test result and are not introduced by the
profile form.

## Browser review

The route was reviewed in the Codex in-app browser against the local
`pnpm dev` server. Captures were inspected in the implementation task and were
not added as repository artifacts.

| Area | Evidence | Result |
| --- | --- | --- |
| Flow selection | Switched from Bachelor to Microcredential and back; headings and fields changed to the selected contract | Passed |
| Captured options | Bachelor Major exposed the contract's captured program options | Passed |
| Dependent options | Choosing BS Information Technology revealed the required Specialization control | Passed |
| External/cascade controls | Current City accepted free entry after selecting Rizal; external controls did not invent client-owned options | Passed |
| Conditional checkbox | Checking the school-not-found control revealed Last School Attended (Other) and its conditional validation | Passed |
| File control | Applicant's Personal Id exposed the typed `sample.pdf` mock fixture | Passed |
| Validation and focus | An invalid Save and continue stayed on step 1, rendered the error summary and field errors, and focused Full name | Passed |
| Responsive layout | Reviewed at 1440x900 and 390x844; the document had no horizontal overflow and fields remained within the mobile content width | Passed with observation below |
| Browser diagnostics | No console warnings or errors were emitted by the page | Passed |

The narrow progress indicator intentionally scrolls horizontally so all steps
remain available. At 390 px the browser shows its horizontal scrollbar. This
is usable, but its visual treatment remains part of the user's UX acceptance.

## Behavior backed by focused tests

The focused component suite covers successful Previous, Save and continue,
Save draft and exit, and Validate and finish paths without requiring a human to
complete every field in the large captured contract. It also covers the
zero-field confirmation step, flow locking after the first successful draft,
duplicate-submit protection, dirty `beforeunload` subscription cleanup, mock
exit callbacks, and injected action errors preserving values.

The mock lifecycle is additionally verified at its composition boundary: one
factory instance is created for the mounted page and `dispose()` clears its
closure-owned `Map` on unmount. Reloading or leaving the page cannot retain a
draft because no browser storage or I/O is used.

## Phase 1 boundary audit

- The only mock import is in
  `feature/e2e/components/profile-form/e2e-profile-form-page.tsx`.
- `feature/e2e/mocks/README.md` contains the exact Phase 2 removal procedure.
- No server actions, database services, edit route, `localStorage`,
  `sessionStorage`, or IndexedDB persistence were added.
- Next.js derives fields and options from `@mihc/enrollmate-contract`; it does
  not duplicate the contract definitions or reusable option sets.
- Phase 2 remains gated for pair programming and has not started.

## Acceptance gate

Automated and agent-led browser verification are complete. The phased
brainstorm must remain unmarked as implemented until the user reviews the
creation experience and explicitly accepts the Phase 1 UX, including the
mobile progress treatment. After that approval, update the brainstorm status
and commit this QA record with the Form README link.
