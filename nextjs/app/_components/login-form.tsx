"use client";

import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { authClient } from "@/lib/better-auth/client";
import {
  loginSchema,
  type LoginFormData,
} from "@/feature/auth/schemas/login.schema";

function getValidationMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return undefined;
}

function getValidationMessages(errors: readonly unknown[]) {
  return [
    ...new Set(
      errors
        .map(getValidationMessage)
        .filter((message): message is string => Boolean(message)),
    ),
  ];
}

export function LoginForm() {
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    } satisfies LoginFormData,
    validators: {
      onChange: loginSchema,
      onBlur: loginSchema,
    },
    onSubmit: async ({ value }) => {
      setAuthError(null);

      const { error } = await authClient.signIn.email(value);

      if (error) {
        setAuthError(error.message || "Unable to log in. Please try again.");
        return;
      }

      router.push("/smoke-testing");
    },
  });

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <Card size="sm" className="w-full max-w-sm">
        <CardHeader className="gap-3">
          <p className="text-sm font-semibold text-foreground">MMDC Testing</p>
          <CardTitle>
            <h1 className="text-xl font-semibold tracking-tight">
              Welcome back
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            aria-label="Log in"
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void form.handleSubmit();
            }}
          >
            <FieldGroup className="gap-4">
              <form.Field name="email">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  const errorId = `${field.name}-error`;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                      <Input
                        className="h-10"
                        id={field.name}
                        name={field.name}
                        type="email"
                        autoComplete="email"
                        value={field.state.value}
                        onChange={(event) => {
                          setAuthError(null);
                          field.handleChange(event.target.value);
                        }}
                        onBlur={field.handleBlur}
                        aria-invalid={isInvalid}
                        aria-required={true}
                        aria-describedby={isInvalid ? errorId : undefined}
                      />
                      {isInvalid && (
                        <FieldError id={errorId}>
                          {getValidationMessages(field.state.meta.errors).join(
                            ". ",
                          )}
                        </FieldError>
                      )}
                    </Field>
                  );
                }}
              </form.Field>
              <form.Field name="password">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid;
                  const errorId = `${field.name}-error`;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id={field.name}
                          name={field.name}
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          value={field.state.value}
                          onChange={(event) => {
                            setAuthError(null);
                            field.handleChange(event.target.value);
                          }}
                          onBlur={field.handleBlur}
                          aria-invalid={isInvalid}
                          aria-required={true}
                          aria-describedby={isInvalid ? errorId : undefined}
                        />
                        <InputGroupButton
                          align="inline-end"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          onClick={() => setShowPassword(!showPassword)}
                          type="button"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </InputGroupButton>
                      </InputGroup>
                      {isInvalid && (
                        <FieldError id={errorId}>
                          {getValidationMessages(field.state.meta.errors).join(
                            " ",
                          )}
                        </FieldError>
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </FieldGroup>

            {authError && <FieldError>{authError}</FieldError>}

            <form.Subscribe
              selector={(state) => [state.isSubmitting]}
              children={([isSubmitting]) => (
                <Button
                  type="submit"
                  className="h-10 w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Logging in..." : "Log in"}
                </Button>
              )}
            />
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
