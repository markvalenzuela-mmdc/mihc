"use client";

import { useRouter } from "next/navigation";

import { profileParamKey } from "@/feature/e2e/components/e2e-testing.query-state";
import {
  E2eProfileFormPage,
  type E2eProfileFormPageProps,
} from "./e2e-profile-form-page";

export function E2eProfileFormRoute(props: E2eProfileFormPageProps) {
  const router = useRouter();

  return (
    <E2eProfileFormPage
      {...props}
      onFinish={(profileId) =>
        router.push(
          `/e2e-testing?${profileParamKey}=${encodeURIComponent(profileId)}`,
        )
      }
    />
  );
}
