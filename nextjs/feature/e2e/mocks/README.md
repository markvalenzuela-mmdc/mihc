# Temporary E2E profile form mock

## Purpose and lifetime

This directory exists only for the Phase 1 E2E profile-creation UI scaffold.
The factory owns an in-memory draft map for one mounted creation page. Draft
data is discarded when that page unmounts or the browser reloads.

## Limitations

The mock performs no persistence, authentication, conflict handling, network
I/O, or backend validation. Its successful responses are UI fixtures, not a
simulation guarantee for the Phase 2 service behavior.

## Allowed imports

Only
`feature/e2e/components/profile-form/e2e-profile-form-page.tsx` may import this
mock. Schemas, serializers, utilities, reusable controls, route files, and
tests must receive typed fixtures and handlers instead. This boundary keeps
the complete directory disposable.

## Phase 2 removal

1. Pass real fixtures, `saveDraft`, and `finalize` handlers as required page
   props from both creation and edit composition.
2. Remove the page's mock fallback and its mock cleanup effect.
3. Delete this complete `feature/e2e/mocks/` directory.
4. Run:

   ```powershell
   rg "feature/e2e/mocks|createInMemoryE2eProfileFormMock|MOCK_E2E" nextjs
   ```

Removal is complete only when that command returns no matches and the Phase 1
profile-form behavior tests still pass unchanged.
