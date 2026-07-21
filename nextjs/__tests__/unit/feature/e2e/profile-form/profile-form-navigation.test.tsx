import { getEnrollmateFlowDefinition } from "@mihc/enrollmate-contract";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import NewE2eProfilePage from "@/app/e2e-testing/profiles/new/page";
import { E2eTestingProfilesTable } from "@/feature/e2e/components/profiles/e2e-testing-profiles-table";
import type { E2eProfileFormEditorStep } from "@/feature/e2e/types/e2e-profile-form.types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/feature/auth/auth-guards", () => ({
  requireAuthenticated: vi.fn().mockResolvedValue({
    id: "user-1",
    name: "Test Operator",
    email: "operator@example.com",
  }),
}));

vi.mock("@/feature/e2e/actions/e2e-profile-form.action", () => ({
  finalizeE2eProfileFormAction: vi.fn(),
}));

const capturedFormProps = vi.hoisted(() => ({
  flows: undefined as
    | Record<"bachelors" | "microcredentials", E2eProfileFormEditorStep[]>
    | undefined,
}));

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/main-shell", () => ({
  MainShell: ({
    children,
    subtitle,
    title,
  }: {
    children: ReactNode;
    subtitle?: string;
    title: string;
  }) => (
    <main>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </main>
  ),
}));

vi.mock(
  "@/feature/e2e/components/profile-form/e2e-profile-form-page",
  () => ({
    E2eProfileFormPage: ({
      flows,
    }: {
      flows: Record<
        "bachelors" | "microcredentials",
        E2eProfileFormEditorStep[]
      >;
    }) => {
      capturedFormProps.flows = flows;
      return <div>Profile form</div>;
    },
  }),
);

describe("E2E profile creation navigation", () => {
  it("links to profile creation from the profiles section header", () => {
    render(
      <NuqsTestingAdapter>
        <E2eTestingProfilesTable
          profiles={{
            data: [],
            meta: {
              isFirstPage: true,
              isLastPage: true,
              currentPage: 1,
              previousPage: null,
              nextPage: null,
              pageCount: 1,
              totalCount: 0,
            },
          }}
        />
      </NuqsTestingAdapter>,
    );

    expect(screen.getByRole("link", { name: "New profile" })).toHaveAttribute(
      "href",
      "/e2e-testing/profiles/new",
    );
  });

  it("opens a profile with shallow URL state", async () => {
    const onUrlUpdate = vi.fn();

    render(
      <NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
        <E2eTestingProfilesTable
          profiles={{
            data: [
              {
                id: "profile-1",
                name: "Ari Santos",
                email: "ari.santos@example.edu",
                flowType: "bachelors",
                status: "new",
                latestRun: null,
              },
            ],
            meta: {
              isFirstPage: true,
              isLastPage: true,
              currentPage: 1,
              previousPage: null,
              nextPage: null,
              pageCount: 1,
              totalCount: 1,
            },
          }}
        />
      </NuqsTestingAdapter>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open profile Ari Santos" }),
    );

    await waitFor(() =>
      expect(onUrlUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          queryString: "?profile=profile-1",
          options: expect.objectContaining({
            history: "push",
            shallow: true,
          }),
        }),
      ),
    );
  });

  it("passes both serialized contract flows to the client form", async () => {
    render(await NewE2eProfilePage());

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Create E2E profile",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Profile form")).toBeInTheDocument();
    expect(capturedFormProps.flows?.bachelors).toHaveLength(
      getEnrollmateFlowDefinition("bachelors").steps.length,
    );
    expect(capturedFormProps.flows?.microcredentials).toHaveLength(
      getEnrollmateFlowDefinition("microcredentials").steps.length,
    );
    expect(capturedFormProps.flows?.bachelors[0]?.sections[0]?.id).toBeTruthy();
    expect(
      capturedFormProps.flows?.microcredentials[0]?.sections[0]?.id,
    ).toBeTruthy();
  });
});
