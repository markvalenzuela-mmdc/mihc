"use client";

import {
  getEnrollmateFlowDefinition,
  type EnrollmateFlowType,
} from "@mihc/enrollmate-contract";
import { formOptions } from "@tanstack/react-form";

import { withForm } from "@/components/blocks/Form/use-form.hook";
import type { E2eProfileFormValues } from "@/feature/e2e/types/e2e-profile-form.types";
import { getDefaultE2eProfileFormValues } from "@/feature/e2e/utils/e2e-profile-form.util";

const defaultValues: E2eProfileFormValues = {
  core: {
    name: "",
    middleName: "",
    email: "",
    flowType: "bachelors",
  },
  enrollmate: getDefaultE2eProfileFormValues(
    getEnrollmateFlowDefinition("bachelors"),
  ),
};

export const e2eProfileFormOptions = formOptions({ defaultValues });

export const E2eProfileCoreFields = withForm({
  ...e2eProfileFormOptions,
  render: function Render({ form }) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Profile details</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Identify this reusable test profile and choose the application flow
            it should follow.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <form.AppField name="core.name">
            {(field) => (
              <field.FormField label="Full name" required>
                <field.FormTextInput
                  autoComplete="name"
                  placeholder="Example student"
                  aria-required="true"
                />
              </field.FormField>
            )}
          </form.AppField>

          <form.AppField name="core.middleName">
            {(field) => (
              <field.FormField label="Middle name">
                <field.FormTextInput autoComplete="additional-name" />
              </field.FormField>
            )}
          </form.AppField>

          <form.AppField name="core.email">
            {(field) => (
              <field.FormField label="Email" required>
                <field.FormTextInput
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="student@example.com"
                  aria-required="true"
                />
              </field.FormField>
            )}
          </form.AppField>

          <fieldset className="min-w-0">
            <form.AppField name="core.flowType">
              {(field) => (
                <field.FormField label="Application flow" required>
                  <field.FormSelect
                    items={[
                      { label: "Bachelor", value: "bachelors" },
                      { label: "Microcredential", value: "microcredentials" },
                    ]}
                    placeholder="Select an application flow"
                    aria-required="true"
                  />
                </field.FormField>
              )}
            </form.AppField>
          </fieldset>
        </div>
      </div>
    );
  },
});
