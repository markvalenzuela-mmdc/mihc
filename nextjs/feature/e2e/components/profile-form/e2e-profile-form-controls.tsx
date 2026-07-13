"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { useFieldContext } from "@/components/blocks/Form/use-form.hook";
import type { E2eProfileFixture } from "@/feature/e2e/types/e2e-profile-form.types";

type ControlAccessibilityProps = {
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-label": string;
  "aria-required"?: boolean;
};

type E2eProfileCheckboxControlProps = ControlAccessibilityProps;

export function E2eProfileCheckboxControl({
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-label": ariaLabel,
  "aria-required": ariaRequired,
}: E2eProfileCheckboxControlProps) {
  const field = useFieldContext<boolean>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Checkbox
      id={field.name}
      name={field.name}
      checked={field.state.value}
      onCheckedChange={(checked) => field.handleChange(checked)}
      onBlur={field.handleBlur}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-errormessage={isInvalid ? ariaErrorMessage : undefined}
      aria-invalid={isInvalid}
      aria-required={ariaRequired}
    />
  );
}

type E2eProfileFreeEntryComboboxProps = ControlAccessibilityProps & {
  options: readonly { label: string; value: string }[];
  placeholder?: string;
};

export function E2eProfileFreeEntryCombobox({
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-label": ariaLabel,
  "aria-required": ariaRequired,
  options,
  placeholder,
}: E2eProfileFreeEntryComboboxProps) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const optionValues = options.map((option) => option.value);

  return (
    <Combobox
      items={optionValues}
      value={field.state.value}
      inputValue={field.state.value}
      onValueChange={(value) => value !== null && field.handleChange(value)}
      onInputValueChange={(value) => field.handleChange(value)}
    >
      <ComboboxInput
        id={field.name}
        name={field.name}
        placeholder={placeholder}
        className="w-full"
        onBlur={field.handleBlur}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-errormessage={isInvalid ? ariaErrorMessage : undefined}
        aria-invalid={isInvalid}
        aria-required={ariaRequired}
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>Enter a value to continue.</ComboboxEmpty>
        <ComboboxList>
          {options.map((option) => (
            <ComboboxItem key={option.value} value={option.value}>
              {option.label}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type E2eProfileFixtureControlProps = ControlAccessibilityProps & {
  fixtures: readonly E2eProfileFixture[];
  placeholder?: string;
};

export function E2eProfileFixtureControl({
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-label": ariaLabel,
  "aria-required": ariaRequired,
  fixtures,
  placeholder,
}: E2eProfileFixtureControlProps) {
  const field = useFieldContext<E2eProfileFixture | undefined>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Combobox
      items={fixtures}
      value={field.state.value ?? null}
      onValueChange={(fixture) => field.handleChange(fixture ?? undefined)}
      itemToStringLabel={(fixture) => fixture.filename}
      itemToStringValue={(fixture) => fixture.fixtureUri}
      isItemEqualToValue={
        (fixture, value) => fixture.fixtureUri === value.fixtureUri
      }
    >
      <ComboboxInput
        id={field.name}
        name={field.name}
        placeholder={placeholder}
        className="w-full"
        onBlur={field.handleBlur}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-errormessage={isInvalid ? ariaErrorMessage : undefined}
        aria-invalid={isInvalid}
        aria-required={ariaRequired}
        disabled={fixtures.length === 0}
      />
      <ComboboxContent>
        <ComboboxEmpty>No fixtures are available.</ComboboxEmpty>
        <ComboboxList>
          {fixtures.map((fixture) => (
            <ComboboxItem key={fixture.fixtureUri} value={fixture}>
              {fixture.filename}
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
