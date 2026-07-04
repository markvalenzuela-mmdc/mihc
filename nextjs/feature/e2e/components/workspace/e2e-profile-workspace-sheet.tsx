"use client";

import { useQueryState } from "nuqs";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useQueryE2eProfileWorkspace } from "../../query/e2e-profile-workspace.query";
import { profileParamKey } from "../e2e-testing.query-state";
import E2eProfileWorkspace from "./e2e-profile-workspace";
import E2eProfileWorkspaceSheetSkeleton from "./e2e-profile-workspace-sheet-skeleton";

export default function E2eProfileWorkspaceSheet() {
  const [selectedProfileId, setSelectedProfileId] =
    useQueryState(profileParamKey);
  const profileId = selectedProfileId ?? "";
  const query = useQueryE2eProfileWorkspace(profileId);

  return (
    <Sheet
      open={profileId.length > 0}
      onOpenChange={(open) => {
        if (!open) setSelectedProfileId(null);
      }}
    >
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-3xl">
        <E2eProfileWorkspaceSheetContent query={query} />
      </SheetContent>
    </Sheet>
  );
}

function E2eProfileWorkspaceSheetContent({
  query,
}: {
  query: ReturnType<typeof useQueryE2eProfileWorkspace>;
}) {
  if (query.isLoading) {
    return <E2eProfileWorkspaceSheetSkeleton />;
  }

  if (query.isError) {
    return (
      <div className="p-4 text-sm text-destructive">
        Could not load e2e profile workspace.
      </div>
    );
  }

  if (query.data) {
    return <E2eProfileWorkspace key={query.data.profile.id} data={query.data} />;
  }

  return null;
}
