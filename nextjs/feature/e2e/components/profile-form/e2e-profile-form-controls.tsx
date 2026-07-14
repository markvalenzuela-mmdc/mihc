"use client";

import { format, isValid, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { E2eProfileFixture } from "@/feature/e2e/types/e2e-profile-form.types";

type ControlAccessibilityProps = {
  "aria-describedby"?: string;
  "aria-errormessage"?: string;
  "aria-label": string;
  "aria-required"?: boolean;
  disabled?: boolean;
};

type E2eProfileCheckboxControlProps = ControlAccessibilityProps;

type E2eProfileDatePickerProps = ControlAccessibilityProps & {
  placeholder?: string;
};

function parseDateValue(value: string) {
  if (!value) return undefined;

  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

export function E2eProfileDatePicker({
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-label": ariaLabel,
  "aria-required": ariaRequired,
  disabled,
  placeholder,
}: E2eProfileDatePickerProps) {
  const field = useFieldContext<string>();
  const [open, setOpen] = useState(false);
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const selectedDate = parseDateValue(field.state.value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={field.name}
            name={field.name}
            type="button"
            variant="outline"
            className="w-full justify-between font-normal"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-errormessage={isInvalid ? ariaErrorMessage : undefined}
            aria-invalid={isInvalid}
            aria-required={ariaRequired}
          >
            {selectedDate ? (
              format(selectedDate, "PPP")
            ) : (
              <span className="text-muted-foreground">
                {placeholder ?? "Pick a date"}
              </span>
            )}
            <CalendarIcon aria-hidden="true" />
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            field.handleChange(format(date, "yyyy-MM-dd"));
            field.handleBlur();
            setOpen(false);
          }}
          disabled={disabled}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}

export function E2eProfileCheckboxControl({
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-label": ariaLabel,
  "aria-required": ariaRequired,
  disabled,
}: E2eProfileCheckboxControlProps) {
  const field = useFieldContext<boolean>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Checkbox
      id={field.name}
      name={field.name}
      disabled={disabled}
      className="size-5 max-w-5 rounded-sm border-2"
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
  disabled,
}: E2eProfileFreeEntryComboboxProps) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const optionValues = options.map((option) => option.value);

  return (
    <Combobox
      items={optionValues}
      value={field.state.value}
      inputValue={field.state.value}
      disabled={disabled}
      onValueChange={(value) => value !== null && field.handleChange(value)}
      onInputValueChange={(value) => field.handleChange(value)}
    >
      <ComboboxInput
        id={field.name}
        name={field.name}
        placeholder={placeholder}
        disabled={disabled}
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
  disabled,
}: E2eProfileFixtureControlProps) {
  const field = useFieldContext<E2eProfileFixture | undefined>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Combobox
      items={fixtures}
      value={field.state.value ?? null}
      disabled={disabled}
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
        disabled={disabled || fixtures.length === 0}
        className="w-full"
        onBlur={field.handleBlur}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-errormessage={isInvalid ? ariaErrorMessage : undefined}
        aria-invalid={isInvalid}
        aria-required={ariaRequired}
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
