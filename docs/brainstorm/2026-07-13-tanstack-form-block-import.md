# TanStack Form Block Import

## Context

The Next.js application currently declares React Hook Form and its Zod resolver,
but no application source imports either package. The external
`hatdoggy/form-architecture` repository contains a TanStack Form architecture
and a separate full-form usage demonstration.

The existing E2E profile-form design expects an unchanged TanStack Form
baseline under `nextjs/components/blocks/Form/`.

## Decision

- Create the work on `feat/86d3n6kxm-2`, based on `main`.
- Copy the five supporting form files from the external repository's `main`
  branch into `nextjs/components/blocks/Form/` without adapting their contents:
  - `form-fields.block.tsx`
  - `form-options.ts`
  - `form-submit.action.ts`
  - `form.schema.ts`
  - `use-form.hook.ts`
- Do not copy `form-full.block.tsx`; it demonstrates how the block is used.
- Add `@tanstack/react-form` and `@tanstack/react-form-nextjs` with pnpm.
- Remove `react-hook-form` and `@hookform/resolvers` with pnpm.
- Update the form-handling entry in `nextjs/code-style.md` to name TanStack Form
  and Zod.
- Do not integrate the block into an application form in this change.

## Consumption and IntelliSense

Consumers should define feature-local typed `formOptions` and pass them to the
block's `useAppForm` and `withForm` helpers. TanStack Form then infers valid
field paths and field value types from `defaultValues`, providing autocomplete
for `form.AppField` names and typed field APIs.

The imported `useGenerateForm` helper remains tied to the copied demonstration
schema. It is preserved for the 1:1 baseline but is not the recommended entry
point for feature forms.

## Validation

- Compare every imported file with its external raw source.
- Confirm the demonstration component is absent.
- Confirm React Hook Form packages and references are gone.
- Run the Next.js TypeScript check and lint with pnpm.
- Review the final diff for unrelated changes.

## Non-goals

- No EnrollMate form implementation.
- No adaptation or refactoring of the imported baseline.
- No copied page, route, or example form.
