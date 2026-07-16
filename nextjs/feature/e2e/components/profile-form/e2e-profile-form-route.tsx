"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { profileParamKey } from "@/feature/e2e/components/e2e-testing.query-state";
import {
  E2eProfileFormPage,
  type E2eProfileFormPageProps,
} from "./e2e-profile-form-page";

export function E2eProfileFormRoute(props: E2eProfileFormPageProps) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();

  function handleFinish(profileId: string) {
    startTransition(() => {
      router.push(
        "/e2e-testing?" +
          profileParamKey +
          "=" +
          encodeURIComponent(profileId),
      );
    });
  }

  return (
    <E2eProfileFormPage
      {...props}
      isNavigating={isNavigating}
      onFinish={handleFinish}
    />
  );
}
