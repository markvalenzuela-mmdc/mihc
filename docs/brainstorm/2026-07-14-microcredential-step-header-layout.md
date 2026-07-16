# Microcredential Step Header Layout

## Context

The E2E profile form renders a responsive progress header above the form. The
header currently uses a fixed four-column grid at the `sm` breakpoint. The
Bachelor flow has four steps, but the Microcredential flow has three steps,
including the confirmation step. On Microcredential confirmation, the three
step items occupy only three of the four columns, leaving an oversized empty
area in the header.

## Goal

Make the progress header distribute all available width evenly across the
actual number of steps in the active flow. Microcredential’s three steps
should each occupy one third of the header; the four-step Bachelor flow should
continue to occupy the full header evenly.

## Options considered

1. Use CSS grid auto-flow with equal-width auto columns. This is the smallest
   change, derives the layout from the rendered children, and supports future
   step counts without another conditional.
2. Set an inline `grid-template-columns` value from `steps.length`. This is
   explicit but adds CSS custom-property or style typing complexity for a
   simple layout rule.
3. Map known step counts to Tailwind `sm:grid-cols-*` classes. This is concise
   for current flows but hard-codes the current flow shapes and requires a
   code change whenever a new flow count is introduced.

## Decision

Use CSS grid auto-flow with equal-width auto columns on the desktop breakpoint:
replace the fixed `sm:grid-cols-4` class with `sm:grid-flow-col sm:auto-cols-fr`.
Keep the existing mobile grid behavior so steps continue to stack on narrow
screens.

## Acceptance criteria

- The Microcredential progress header renders its three steps across the full
  available header width with equal columns.
- The Bachelor progress header still renders its four steps across the full
  available header width with equal columns.
- Mobile progress layout remains a single stacked column.
- No form navigation, validation, confirmation, or existing user-owned changes
  are altered.

## Scope

Only `nextjs/feature/e2e/components/profile-form/e2e-profile-form-progress.tsx`
and a focused regression test, if the existing test structure supports the
progress component directly, are in scope. Verification should include the
focused unit test, Next.js lint/typecheck as practical, and `git diff --check`.
