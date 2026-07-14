import { AppShell } from "@/components/app-shell";
import { MainShell } from "@/components/main-shell";
import {
  finalizeE2eProfileFormAction,
  saveE2eProfileDraftAction,
} from "@/feature/e2e/actions/e2e-profile-form.action";
import { E2eProfileFormRoute } from "@/feature/e2e/components/profile-form/e2e-profile-form-route";
import {
  E2eProfileFormError,
  E2eProfileFormErrorCode,
} from "@/feature/e2e/errors/e2e-profile-form.error";
import { getE2eProfileFormEditorData } from "@/feature/e2e/services/e2e-profile-form-editor.service";
import type { E2eProfileFormValues } from "@/feature/e2e/types/e2e-profile-form.types";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAuthenticated } from "@/feature/auth/auth-guards";

type PageProps = {
  params: Promise<{ profileId: string }>;
};

function BlockedProfileEditor({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default async function EditE2eProfilePage({ params }: PageProps) {
  const user = await requireAuthenticated();
  const { profileId } = await params;
  let editor;

  try {
    editor = await getE2eProfileFormEditorData(profileId);
  } catch (error) {
    if (
      error instanceof E2eProfileFormError &&
      error.code === E2eProfileFormErrorCode.NOT_FOUND
    ) {
      notFound();
    }

    const message =
      error instanceof E2eProfileFormError &&
      error.code === E2eProfileFormErrorCode.DEFINITION_CONFLICT
        ? "This profile uses an older form definition and cannot be resumed."
        : "This profile is finalized and cannot be edited.";

    return (
      <AppShell user={user}>
        <MainShell
          title="Edit E2E profile"
          subtitle="Profile editing is unavailable."
        >
          <BlockedProfileEditor message={message} />
        </MainShell>
      </AppShell>
    );
  }

  const initialValues: E2eProfileFormValues = {
    core: editor.core,
    enrollmate: editor.enrollmateData,
  };

  return (
    <AppShell user={user}>
      <MainShell
        title="Edit E2E profile"
        subtitle="Resume the saved profile draft and complete its validated application steps."
      >
        <Suspense fallback={<p>Loading profile form...</p>}>
          <E2eProfileFormRoute
            profileId={editor.profileId}
            flows={editor.flows}
            initialValues={initialValues}
            initialStep={editor.initialStep}
            initialValidatedSteps={editor.validatedSteps}
            fixtures={editor.fixtures}
            saveDraft={saveE2eProfileDraftAction}
            finalize={finalizeE2eProfileFormAction}
          />
        </Suspense>
      </MainShell>
    </AppShell>
  );
}
