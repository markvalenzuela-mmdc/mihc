"use client";

import type { ComponentPropsWithoutRef } from "react";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useFieldContext } from "./use-form.hook";

type FormControlAccessibilityProps = Pick<
  ComponentPropsWithoutRef<typeof Input>,
  "aria-describedby" | "aria-errormessage" | "aria-required"
>;

function getErrorMessages(error: unknown): string[] {
  if (typeof error === "string") return error ? [error] : [];
  if (Array.isArray(error)) return error.flatMap(getErrorMessages);
  if (!error || typeof error !== "object") return [];

  if ("message" in error && typeof error.message === "string") {
    return [error.message];
  }
  if ("issues" in error) return getErrorMessages(error.issues);
  if ("errors" in error) return getErrorMessages(error.errors);
  return [];
}

/**
 * Wrapper component that handles html form semantics and accessibility.
 * Also handles the label and error message.
 */
export function FormField({
  label,
  errorId,
  required = false,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof Field> & {
  errorId?: string;
  label: string;
  required?: boolean;
}) {
  const field = useFieldContext();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const errorMessages = [
    ...new Set(field.state.meta.errors.flatMap(getErrorMessages)),
  ];

  return (
    <Field
      data-invalid={isInvalid}
      className={cn("gap-0", className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {required && (
          <span className="text-sm font-normal text-muted-foreground">
            (required)
          </span>
        )}
      </div>
      {children}
      {isInvalid && errorMessages.length > 0 && (
        <FieldError id={errorId}>{errorMessages.join(". ")}</FieldError>
      )}
    </Field>
  );
}

/**
 * Text input component
 */
export function FormTextInput({
  type,
  inputMode,
  autoComplete,
  placeholder,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-required": ariaRequired,
}: Pick<
  ComponentPropsWithoutRef<typeof Input>,
  | "type"
  | "inputMode"
  | "autoComplete"
  | "placeholder"
  | "className"
> &
  FormControlAccessibilityProps) {
  const field = useFieldContext<string>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Input
      id={field.name}
      name={field.name}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      placeholder={placeholder}
      className={cn("", className)}
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      aria-invalid={isInvalid}
      aria-describedby={ariaDescribedBy}
      aria-errormessage={isInvalid ? ariaErrorMessage : undefined}
      aria-required={ariaRequired}
    />
  );
}

/**
 * Text area component
 */
export function FormTextarea({
  placeholder,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-required": ariaRequired,
}: Pick<
  ComponentPropsWithoutRef<typeof Textarea>,
  "placeholder" | "className"
> &
  FormControlAccessibilityProps) {
  const field = useFieldContext<string>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Textarea
      id={field.name}
      name={field.name}
      placeholder={placeholder}
      className={cn("", className)}
      value={field.state.value}
      onChange={(e) => field.handleChange(e.target.value)}
      onBlur={field.handleBlur}
      aria-invalid={isInvalid}
      aria-describedby={ariaDescribedBy}
      aria-errormessage={isInvalid ? ariaErrorMessage : undefined}
      aria-required={ariaRequired}
    />
  );
}

/**
 * Select component
 */
export function FormSelect({
  items,
  placeholder,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-errormessage": ariaErrorMessage,
  "aria-required": ariaRequired,
}: Pick<
  ComponentPropsWithoutRef<typeof SelectValue>,
  "placeholder" | "className"
> & {
  items: readonly { label: string; value: string }[];
} &
  FormControlAccessibilityProps) {
  const field = useFieldContext<string>();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <FieldGroup className="flex flex-row items-center">
      <Select
        id={field.name}
        name={field.name}
        items={items}
        value={field.state.value}
        onValueChange={(val) => val && field.handleChange(val)}
      >
        <SelectTrigger
          className={cn("flex-1", className)}
          aria-describedby={ariaDescribedBy}
          aria-errormessage={isInvalid ? ariaErrorMessage : undefined}
          aria-invalid={isInvalid}
          aria-required={ariaRequired}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.label} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FieldGroup>
  );
}
