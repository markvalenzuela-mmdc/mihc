# TanStack Form block

This block registers the application's shared form-field components with
TanStack Form. Use it to get typed field names, inferred values, shared field
markup, and a consistent composition API.

The application already provides these dependencies:

- `@tanstack/react-form`
- `@tanstack/react-form-nextjs`
- `zod`
- the local `Field`, `Input`, `Textarea`, and `Select` UI primitives

## Public API

Import the form APIs from `use-form.hook.ts`:

```ts
import {
  useAppForm,
  useFieldContext,
  withForm,
} from "@/components/blocks/Form/use-form.hook";
```

- `useAppForm` creates a typed form with the registered field components.
- `withForm` extracts a typed section or layout without losing the parent
  form's field-name and value inference.
- `useFieldContext` is available for building additional field controls that
  participate in the same form context.
- `FormField` renders the label and touched-field validation errors.
- `FormTextInput`, `FormTextarea`, and `FormSelect` bind the local UI primitives
  to the active TanStack field. The current select adapter is string-valued.

Registered components are accessed through the `field` value passed to an
`AppField` render function; they are not imported directly by consumers.

## Recommended setup

Keep the schema, default values, and form options in the consuming feature.
This is what gives TypeScript enough information to autocomplete field names
and infer submitted values.

```ts
// feature/profile/profile.schema.ts
import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  notes: z.string(),
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
  notes: "",
  role: "student",
};

export const profileFormOptions = formOptions({
  defaultValues,
  validators: {
    onSubmit: profileSchema,
  },
});
```

Spread those options into `useAppForm`, then render registered controls through
`form.AppField`:

```tsx
// feature/profile/profile-form.tsx
"use client";

import { useAppForm } from "@/components/blocks/Form/use-form.hook";
import { Button } from "@/components/ui/button";
import { profileFormOptions } from "./profile.form-options";
import { saveProfile } from "./profile.action";

const ROLE_ITEMS = [
  { label: "Student", value: "student" },
  { label: "Operator", value: "operator" },
] as const;

export function ProfileForm() {
  const form = useAppForm({
    ...profileFormOptions,
    onSubmit: async ({ value }) => {
      // `value` is inferred from profileFormOptions.
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
        <form.AppField name="name">
          {(field) => (
            <field.FormField label="Name">
              <field.FormTextInput placeholder="Jane Doe" />
            </field.FormField>
          )}
        </form.AppField>

        <form.AppField name="email">
          {(field) => (
            <field.FormField label="Email">
              <field.FormTextInput placeholder="jane@example.com" />
            </field.FormField>
          )}
        </form.AppField>

        <form.AppField name="notes">
          {(field) => (
            <field.FormField label="Notes">
              <field.FormTextarea placeholder="Optional notes" />
            </field.FormField>
          )}
        </form.AppField>

        <form.AppField name="role">
          {(field) => (
            <field.FormField label="Role">
              <field.FormSelect
                items={ROLE_ITEMS}
                placeholder="Select a role"
              />
            </field.FormField>
          )}
        </form.AppField>

        <Button type="submit">Save profile</Button>
      </form>
    </form.AppForm>
  );
}
```

In that component:

- `name` on `form.AppField` autocompletes `name`, `email`, `notes`, and `role`;
- an unknown field name is a TypeScript error;
- the `value` received by `onSubmit` is inferred as `ProfileFormValues`;
- Zod runs as the submit validator before `onSubmit` is called; and
- field errors appear after a field is touched because `FormField` reads the
  active field's metadata.

## Splitting a large form

Use `withForm` when a form layout needs smaller components. Spread the same
options into `withForm` so the extracted component retains the parent's field
contract:

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
            <field.FormTextInput />
          </field.FormField>
        )}
      </form.AppField>
    );
  },
});
```

Render it from the owning form with `<ProfileIdentityFields form={form} />`.
Both components now use the same typed field names and values.

## Server validation

Client validation improves feedback but does not establish trust. A server
action must validate its input again with the feature-owned schema before
persisting data:

```ts
// feature/profile/profile.action.ts
"use server";

import { profileSchema } from "./profile.schema";

export async function saveProfile(input: unknown) {
  const values = profileSchema.parse(input);

  // Authorize the request, persist `values`, and return the feature's normal
  // server-action result contract here.
}
```

For a native `FormData` workflow, `@tanstack/react-form-nextjs` also provides
the server-validation and form-state utilities used by the preserved upstream
example. Build any production adapter beside the consuming feature so its
schema, result type, authorization, and persistence behavior remain explicit.

## Preserved upstream example path

The five TypeScript files in this directory are copied unchanged from
`hatdoggy/form-architecture` commit
`ca4e920d21a48bb569d120b0a6efc064ac17b634`:

- `form-fields.block.tsx`
- `form-options.ts`
- `form-submit.action.ts`
- `form.schema.ts`
- `use-form.hook.ts`

`useGenerateForm`, `form.schema.ts`, `form-options.ts`, and
`form-submit.action.ts` remain tied to the upstream first-name/last-name/email
example. Preserve them for the 1:1 reference baseline, but do not use that path
as the starting point for a product form. Product forms should use feature-local
options with `useAppForm` and `withForm`, as shown above.

This README is local documentation and is not part of the upstream 1:1 source
comparison. The upstream `form-full.block.tsx` usage demonstration is
intentionally not included in this repository.
