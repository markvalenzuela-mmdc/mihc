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

/**
 * Wrapper component that handles html form semantics and accessibility.
 * Also handles the label and error message.
 */
export function FormField({
  label,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof Field> & {
  label: string;
}) {
  const field = useFieldContext();

  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field
      data-invalid={isInvalid}
      className={cn("gap-0", className)}
      {...props}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      {children}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
}: Pick<
  ComponentPropsWithoutRef<typeof Input>,
  | "type"
  | "inputMode"
  | "autoComplete"
  | "placeholder"
  | "className"
>) {
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
    />
  );
}

/**
 * Text area component
 */
export function FormTextarea({
  placeholder,
  className,
}: Pick<ComponentPropsWithoutRef<typeof Input>, "placeholder" | "className">) {
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
}: Pick<
  ComponentPropsWithoutRef<typeof SelectValue>,
  "placeholder" | "className"
> & {
  items: readonly { label: string; value: string }[];
}) {
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
        aria-invalid={isInvalid}
      >
        <SelectTrigger className={cn("flex-1", className)}>
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
