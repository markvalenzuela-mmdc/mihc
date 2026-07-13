# TanStack Form block

This block registers the application's reusable form-field components with
TanStack Form. It contains only two source files:

- `form-fields.block.tsx` binds the local field, input, textarea, and select UI
  primitives to TanStack field state.
- `use-form.hook.ts` exports the shared form contexts, `useAppForm`, `withForm`,
  and `useFieldContext`.

Schemas, default values, form options, submission handlers, and feature-specific
controls belong in the consuming feature. Keeping those definitions together is
what preserves field-name autocomplete and submitted-value inference.

## Public API

```ts
import {
  useAppForm,
  useFieldContext,
  withForm,
} from "@/components/blocks/Form/use-form.hook";
```

- `useAppForm` creates a typed form with the registered controls.
- `withForm` extracts typed sections without losing the parent form's field
  names or value types.
- `useFieldContext` supports additional feature-local controls that participate
  in the same form context.

The registered `FormField`, `FormTextInput`, `FormTextarea`, and `FormSelect`
components are available from the field passed to `form.AppField`. Consumers do
not import them directly. `FormSelect` is intentionally string-valued.

## Feature-local setup

Define the schema and options beside the consuming form:

```ts
// feature/profile/profile.schema.ts
import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  role: z.enum(["student", "operator"]),
});

export type ProfileFormValues = z.input<typeof profileSchema>;
```

```ts
// feature/profile/profile.form-options.ts
import { formOptions } from "@tanstack/react-form";
import {
  profileSchema,
  type ProfileFormValues,
} from "./profile.schema";

const defaultValues: ProfileFormValues = {
  name: "",
  email: "",
  role: "student",
};

export const profileFormOptions = formOptions({
  defaultValues,
  validators: {
    onSubmit: profileSchema,
  },
});
```

Spread those options into `useAppForm` and render registered controls through
`form.AppField`:

```tsx
"use client";

import { useAppForm } from "@/components/blocks/Form/use-form.hook";
import { saveProfile } from "./profile.action";
import { profileFormOptions } from "./profile.form-options";

const ROLE_ITEMS = [
  { label: "Student", value: "student" },
  { label: "Operator", value: "operator" },
] as const;

export function ProfileForm() {
  const form = useAppForm({
    ...profileFormOptions,
    onSubmit: async ({ value }) => {
      // `value` is inferred as ProfileFormValues.
      await saveProfile(value);
    },
  });

  return (
    <form.AppForm>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.AppField name="email">
          {(field) => (
            <field.FormField label="Email">
              <field.FormTextInput
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="jane@example.com"
              />
            </field.FormField>
          )}
        </form.AppField>

        <form.AppField name="role">
          {(field) => (
            <field.FormField label="Role">
              <field.FormSelect items={ROLE_ITEMS} placeholder="Select a role" />
            </field.FormField>
          )}
        </form.AppField>
      </form>
    </form.AppForm>
  );
}
```

Here, `form.AppField` autocompletes the schema-backed field names, rejects
unknown names, and carries the inferred value type into `onSubmit`.

## Splitting a form

Use `withForm` with the same feature-owned options when a large form needs
smaller typed sections:

```tsx
import { withForm } from "@/components/blocks/Form/use-form.hook";
import { profileFormOptions } from "./profile.form-options";

export const ProfileIdentityFields = withForm({
  ...profileFormOptions,
  props: {},
  render: function Render({ form }) {
    return (
      <form.AppField name="name">
        {(field) => (
          <field.FormField label="Name">
            <field.FormTextInput autoComplete="name" />
          </field.FormField>
        )}
      </form.AppField>
    );
  },
});
```

Feature submission boundaries must validate again before persisting. The block
does not provide a server-action adapter or own authorization and persistence.

## Current consumer

The E2E profile creation scaffold is the first production-shaped consumer of
this block. Its form composition lives in
`feature/e2e/components/profile-form/`, with the route at
`app/e2e-testing/profiles/new/page.tsx`. It demonstrates nested typed field
names, `withForm`, feature-local controls using `useFieldContext`, and
contract-driven Zod validation without moving feature schemas or actions into
the reusable block.
