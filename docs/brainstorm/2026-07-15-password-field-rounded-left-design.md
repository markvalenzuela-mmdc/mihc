# Password Field Left-Corner Rounding

## Request

Fix the password field on the login page because its left side does not appear
rounded.

## Context

The login page is rendered by `nextjs/app/_components/login-form.tsx`. The
password control uses the shared `InputGroup` primitives so the visibility
toggle can sit inside the field. `InputGroupInput` intentionally applies
`rounded-none`, while the containing `InputGroup` supplies the border and
overall rounded shape. The child input can therefore visually mask the
container's left corners, especially when its background is visible.

## Options considered

1. Add `rounded-l-md` to the password input in the login form. This is a
   narrow, reversible fix that affects only the reported control.
2. Change the shared `InputGroupInput` primitive. This could change the shape
   of other grouped controls, including groups with leading add-ons.
3. Add clipping to the shared `InputGroup` container. This is broader and may
   clip focus-ring or button visuals.

## Decision

Use option 1. Add a local `rounded-l-md` class to the password field's
`InputGroupInput` in `login-form.tsx`. Preserve the eye-toggle behavior,
validation, accessibility attributes, and all unrelated input-group styling.

## Verification

- Add a focused login-form test assertion that the password control has the
  left-rounding class.
- Run the login-form unit test.
- Run Next.js lint and `git diff --check`.
- Confirm the existing unrelated working-tree changes remain untouched.

## Open questions

None. The user approved the local class approach.
