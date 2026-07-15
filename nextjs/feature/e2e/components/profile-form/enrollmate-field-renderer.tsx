"use client";

import type {
  EnrollmateField,
  EnrollmateFieldType,
} from "@mihc/enrollmate-contract";
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  HTMLInputTypeAttribute,
  PropsWithChildren,
} from "react";

import { FieldDescription } from "@/components/ui/field";
import type { E2eProfileFixture } from "@/feature/e2e/types/e2e-profile-form.types";
import {
  getEnrollmateFieldOptions,
  isEnrollmateParentFieldDisabled,
  isEnrollmateFieldRendered,
} from "@/feature/e2e/utils/e2e-profile-form.util";
import {
  E2eProfileCheckboxControl,
  E2eProfileDatePicker,
  E2eProfileFixtureControl,
  E2eProfileFreeEntryCombobox,
} from "./e2e-profile-form-controls";

type RegisteredFormFieldProps = PropsWithChildren<
  ComponentPropsWithoutRef<"div"> & {
    errorId?: string;
    label: string;
    orientation?: "vertical" | "horizontal";
    required?: boolean;
  }
>;

type RegisteredControlAccessibilityProps = {
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-required"?: boolean;
  disabled?: boolean;
};

type EnrollmateBoundField = {
  FormField: ComponentType<RegisteredFormFieldProps>;
  FormSelect: ComponentType<
    {
      className?: string;
      disabled?: boolean;
      items: readonly { label: string; value: string }[];
      placeholder?: string;
    } & RegisteredControlAccessibilityProps
  >;
  FormTextInput: ComponentType<
    {
      autoComplete?: string;
      className?: string;
      disabled?: boolean;
      inputMode?: ComponentPropsWithoutRef<"input">["inputMode"];
      placeholder?: string;
      type?: HTMLInputTypeAttribute;
    } & RegisteredControlAccessibilityProps
  >;
  FormTextarea: ComponentType<
    {
      className?: string;
      disabled?: boolean;
      placeholder?: string;
    } & RegisteredControlAccessibilityProps
  >;
};

export type EnrollmateFieldRenderProps = {
  definition: EnrollmateField;
  fixtures: readonly E2eProfileFixture[];
  values: Record<string, unknown>;
};

type EnrollmateFieldRendererProps = EnrollmateFieldRenderProps & {
  boundField: EnrollmateBoundField;
};

function getDescriptionId(field: EnrollmateField) {
  return `enrollmate-${field.name.replace(/[^a-zA-Z0-9_-]/g, "-")}-description`;
}

function getErrorId(field: EnrollmateField) {
  return `enrollmate-${field.name.replace(/[^a-zA-Z0-9_-]/g, "-")}-error`;
}

function getInputType(field: EnrollmateField): HTMLInputTypeAttribute {
  if (field.type === "email" || field.type === "tel" || field.type === "date") {
    return field.type;
  }

  return (field.htmlInputType as HTMLInputTypeAttribute | undefined) ?? "text";
}

function getInputMode(field: EnrollmateField) {
  if (field.type === "email") return "email" as const;
  if (field.type === "tel") return "tel" as const;
  return undefined;
}

function acceptsFreeEntry(field: EnrollmateField) {
  switch (field.optionSource?.kind) {
    case "cascade":
    case "external":
      return true;
    case undefined:
    case "inline":
    case "reusable":
    case "dependent":
      return false;
    default: {
      const unsupported: never = field.optionSource;
      throw new Error(`Unsupported EnrollMate option source: ${unsupported}`);
    }
  }
}

function renderControl({
  boundField,
  definition,
  errorId,
  fixtures,
  isRequired,
  isDisabled,
  values,
  descriptionId,
}: EnrollmateFieldRendererProps & {
  descriptionId?: string;
  errorId: string;
  isRequired: boolean;
  isDisabled: boolean;
}) {
  const options = getEnrollmateFieldOptions(definition, values);
  const accessibility = {
    "aria-describedby": descriptionId,
    "aria-errormessage": errorId,
    "aria-label": definition.label,
    "aria-required": isRequired,
    disabled: isDisabled,
  };

  if (acceptsFreeEntry(definition)) {
    return (
      <E2eProfileFreeEntryCombobox
        {...accessibility}
        disabled={isDisabled}
        options={options}
        placeholder={definition.placeholder}
      />
    );
  }

  switch (definition.type) {
    case "text":
    case "email":
    case "tel":
      return (
        <boundField.FormTextInput
          {...accessibility}
          disabled={isDisabled}
          type={getInputType(definition)}
          inputMode={getInputMode(definition)}
          placeholder={definition.placeholder}
        />
      );
    case "date":
      return (
        <E2eProfileDatePicker
          {...accessibility}
          disabled={isDisabled}
          placeholder={definition.placeholder}
        />
      );
    case "textarea":
      return (
        <boundField.FormTextarea
          {...accessibility}
          disabled={isDisabled}
          placeholder={definition.placeholder}
        />
      );
    case "select":
    case "combobox":
      return (
        <boundField.FormSelect
          {...accessibility}
          disabled={isDisabled}
          items={options}
          placeholder={definition.placeholder ?? "Select an option"}
        />
      );
    case "checkbox":
      return (
        <E2eProfileCheckboxControl {...accessibility} disabled={isDisabled} />
      );
    case "file":
      return (
        <E2eProfileFixtureControl
          {...accessibility}
          disabled={isDisabled}
          fixtures={fixtures}
          placeholder="Select a fixture"
        />
      );
    default: {
      const unsupported: never = definition.type;
      throw new Error(`Unsupported EnrollMate field type: ${unsupported}`);
    }
  }
}

export function EnrollmateFieldRenderer({
  boundField,
  definition,
  fixtures,
  values,
}: EnrollmateFieldRendererProps) {
  if (!isEnrollmateFieldRendered(definition, values)) return null;

  const descriptionId = definition.description
    ? getDescriptionId(definition)
    : undefined;
  const errorId = getErrorId(definition);
  const isDisabled = isEnrollmateParentFieldDisabled(definition, values);
  const isRequired =
    !isDisabled &&
    (definition.required ||
      (definition.requiredWhenConditionMet &&
        definition.conditionalOn !== null));

  return (
    <boundField.FormField
      errorId={errorId}
      label={definition.label}
      orientation={definition.type === "checkbox" ? "horizontal" : "vertical"}
      required={isRequired}
      className={"gap-2"}
    >
      {renderControl({
        boundField,
        definition,
        descriptionId,
        errorId,
        fixtures,
        isRequired,
        isDisabled,
        values,
      })}
      {definition.description && (
        <FieldDescription id={descriptionId}>
          {definition.description}
        </FieldDescription>
      )}
    </boundField.FormField>
  );
}
