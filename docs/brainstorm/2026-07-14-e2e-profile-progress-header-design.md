# E2E Profile Progress Header Design

## Goal

Improve the visual hierarchy and mobile usability of the non-interactive
progress header on the Create E2E Profile page without changing form
navigation or the contract-owned step labels.

## Approved direction

Use a responsive hybrid stepper in
`nextjs/feature/e2e/components/profile-form/e2e-profile-form-progress.tsx`:

- On larger screens, present the four steps as a clean horizontal progress
  rail.
- On small screens, switch to four full-width rows so every label remains
  readable without horizontal scrolling.
- Use a compact numbered marker for upcoming steps and a check marker for
  validated steps.
- Give the active step the strongest surface and text treatment, and show the
  visible `Current step` status only for the active item.
- Preserve the existing `nav`, ordered-list semantics, contract-derived step
  titles, and `aria-current="step"` behavior.
- Keep the header display-only; existing form actions remain the only way to
  move between steps.

## Alternatives considered

1. A mobile-only summary with a progress bar would be more compact but would
   hide the other step names.
2. A two-by-two mobile card grid would show all steps but would wrap the long
   parent/guardian label awkwardly and add unnecessary card weight.

The responsive hybrid stepper was selected because it keeps the full context
visible at every viewport size while removing the current horizontal-scroll
failure mode.

## Validation

- Confirm the four labels remain rendered and the active item keeps
  `aria-current="step"`.
- Run the focused profile-form page test.
- Run lint for the touched component and `git diff --check`.
- Manually check desktop and narrow mobile widths if the local app is
  available.

## Scope boundary

Only the progress-header component should change. Do not modify form state,
navigation callbacks, page copy, shared tokens, or unrelated dirty files.
