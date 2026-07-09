import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getE2eProfileById,
  getE2eRunById,
  getPaginatedE2eProfiles,
  getPaginatedE2eRunsForProfile,
} from "@/feature/e2e/services/e2e-profile.service";

describe("e2e profile service", () => {
  const profilesFindMany = vi.fn();
  const profilesFindFirst = vi.fn();
  const e2eStepsFindMany = vi.fn();
  const e2eRunsFindMany = vi.fn();
  const e2eRunsFindFirst = vi.fn();
  const enrollmateOptionsFindMany = vi.fn();
  const where = vi.fn();
  const from = vi.fn<() => unknown>(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  const db = {
    query: {
      profiles: {
        findMany: profilesFindMany,
        findFirst: profilesFindFirst,
      },
      e2eSteps: {
        findMany: e2eStepsFindMany,
      },
      e2eRuns: {
        findMany: e2eRunsFindMany,
        findFirst: e2eRunsFindFirst,
      },
      enrollmateOptions: {
        findMany: enrollmateOptionsFindMany,
      },
    },
    select,
  };

  beforeEach(() => {
    profilesFindMany.mockReset();
    profilesFindFirst.mockReset();
    e2eStepsFindMany.mockReset();
    e2eRunsFindMany.mockReset();
    e2eRunsFindFirst.mockReset();
    enrollmateOptionsFindMany.mockReset();
    where.mockReset();
    from.mockClear();
    select.mockClear();
  });

  it("returns paginated profile summaries with latest runs", async () => {
    profilesFindMany.mockResolvedValue([
      {
        id: "profile-1",
        name: "Alex Student",
        email: "alex@example.com",
        program: "BSIT",
        cohort: "2026",
        status: "new",
        e2eRuns: [{ id: "run-1", runNumber: 4, status: "completed" }],
      },
      {
        id: "profile-2",
        name: "Jamie Student",
        email: "jamie@example.com",
        program: "BSBA",
        cohort: "2026",
        status: "new",
        e2eRuns: [],
      },
    ]);
    from.mockReturnValueOnce(Promise.resolve([{ total: 2 }]));

    await expect(
      getPaginatedE2eProfiles({ limit: 10, page: 1 }, db as never),
    ).resolves.toMatchObject({
      data: [
        {
          id: "profile-1",
          latestRun: { id: "run-1", runNumber: 4, status: "completed" },
        },
        {
          id: "profile-2",
          latestRun: null,
        },
      ],
      meta: {
        totalCount: 2,
        pageCount: 1,
      },
    });

    expect(profilesFindMany).toHaveBeenCalledWith({
      orderBy: expect.any(Function),
      limit: 10,
      offset: 0,
      with: {
        e2eRuns: {
          orderBy: expect.any(Function),
          limit: 1,
        },
      },
    });
  });

  it("returns null when a profile has no enrollment data", async () => {
    profilesFindFirst.mockResolvedValue({
      id: "profile-1",
      enrollmentData: null,
    });
    e2eStepsFindMany.mockResolvedValue([]);
    e2eRunsFindFirst.mockResolvedValue(null);

    await expect(getE2eProfileById("profile-1", db as never)).resolves.toBeNull();
  });

  it("returns a profile workspace with serialized active run details", async () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const profile = {
      id: "profile-1",
      name: "Alex Student",
      email: "alex@example.com",
      program: "BSIT",
      cohort: "2026",
      status: "in_progress",
      middleName: null,
      catalogVersionId: "catalog-version-1",
      e2eRuns: [],
      enrollmentData: {
        id: "enrollment-1",
        currentProvinceOptionId: "province-option-1",
      },
      learnerReadiness: {
        id: "readiness-1",
        assistanceNeedScore: 7,
        deviceAccessOptionId: "device-option-1",
      },
      paymentDetails: {
        id: "payment-1",
        paymentMethod: "GCash",
      },
      studyBuddy: {
        id: "study-buddy-1",
        sbNomineeEmail: "buddy@example.com",
      },
      documents: {
        id: "documents-1",
        applicantPersonalIdGDriveLink: "https://drive.example/id",
      },
      additionalInfo: {
        id: "additional-info-1",
        courseraInviteSent: true,
      },
      disclosures: {
        id: "disclosures-1",
        dataPrivacy1: true,
      },
      systemInfo: {
        id: "system-info-1",
        isSentToApi: true,
      },
      flows: [
        {
          id: "flow-1",
          flowType: "bachelors",
          bachelorData: {
            id: "bachelor-data-1",
            majorOptionId: "major-option-1",
            relatedPeople: [
              {
                id: "related-person-1",
                role: "father",
                livingStatusOptionId: "living-status-option-1",
                addresses: [
                  {
                    id: "related-address-1",
                    addressType: "current",
                    sameAsApplicant: true,
                  },
                ],
              },
            ],
            studyReasons: [
              {
                option: {
                  id: "study-reason-option-1",
                  label: "Career growth",
                  submittedValue: "career-growth",
                },
              },
            ],
            documents: null,
          },
          microcredentialData: null,
          discoveryChannels: [
            {
              option: {
                id: "discovery-option-1",
                label: "Facebook",
                submittedValue: "facebook",
              },
            },
          ],
        },
        {
          id: "flow-2",
          flowType: "microcredentials",
          bachelorData: null,
          microcredentialData: {
            id: "microcredential-data-1",
            certificationOptionId: "certification-option-1",
            learnerReadiness: null,
          },
          discoveryChannels: [],
        },
      ],
    };
    const activeRun = {
      id: "run-1",
      runNumber: 1,
      profileId: "profile-1",
      status: "running",
      startedByUser: null,
      startedAt,
      completedAt: null,
      runSteps: [],
    };
    const latestRun = {
      id: "run-2",
      runNumber: 2,
      status: "completed",
    };
    profilesFindFirst.mockResolvedValue(profile);
    e2eStepsFindMany.mockResolvedValue([{ id: "submitted" }]);
    e2eRunsFindFirst
      .mockResolvedValueOnce(activeRun)
      .mockResolvedValueOnce(latestRun);
    enrollmateOptionsFindMany.mockResolvedValue([
      {
        id: "major-option-1",
        label: "Information Technology",
        submittedValue: "BSIT",
      },
      {
        id: "device-option-1",
        label: "Laptop",
        submittedValue: "laptop",
      },
    ]);

    await expect(getE2eProfileById("profile-1", db as never)).resolves.toEqual({
      profile: {
        ...profile,
        latestRun,
        catalogOptions: [
          {
            id: "major-option-1",
            label: "Information Technology",
            submittedValue: "BSIT",
          },
          {
            id: "device-option-1",
            label: "Laptop",
            submittedValue: "laptop",
          },
        ],
        enrollmentData: profile.enrollmentData,
      },
      activeRun: {
        id: "run-1",
        runNumber: 1,
        profileId: "profile-1",
        status: "running",
        startedBy: null,
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: null,
        steps: [],
      },
      stepDefinitions: [{ id: "submitted" }],
    });

    expect(profilesFindFirst).toHaveBeenCalledWith({
      where: expect.any(Function),
      with: {
        enrollmentData: true,
        learnerReadiness: true,
        paymentDetails: true,
        studyBuddy: true,
        documents: true,
        additionalInfo: true,
        disclosures: true,
        systemInfo: true,
        flows: expect.objectContaining({
          with: expect.objectContaining({
            bachelorData: expect.any(Object),
            microcredentialData: expect.any(Object),
            discoveryChannels: expect.any(Object),
          }),
        }),
      },
    });
    expect(enrollmateOptionsFindMany).toHaveBeenCalledWith({
      where: expect.any(Function),
      columns: {
        id: true,
        label: true,
        submittedValue: true,
      },
    });
  });

  it("requires a profile id for profile workspace lookup", async () => {
    await expect(getE2eProfileById("", db as never)).rejects.toThrow(
      "Profile ID is required",
    );
  });

  it("returns paginated run history for a profile", async () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const completedAt = new Date("2026-01-01T00:02:00.000Z");
    e2eRunsFindMany.mockResolvedValue([
      {
        id: "run-1",
        runNumber: 1,
        profileId: "profile-1",
        status: "completed",
        startedByUser: { id: "user-1", name: "Operator" },
        startedAt,
        completedAt,
      },
    ]);
    where.mockResolvedValue([{ total: 1 }]);

    await expect(
      getPaginatedE2eRunsForProfile(
        { profileId: "profile-1", limit: 5, page: 1 },
        db as never,
      ),
    ).resolves.toMatchObject({
      data: [
        {
          id: "run-1",
          startedAt: "2026-01-01T00:00:00.000Z",
          completedAt: "2026-01-01T00:02:00.000Z",
        },
      ],
      meta: {
        totalCount: 1,
      },
    });
  });

  it("requires profile and run ids for selected run lookup", async () => {
    await expect(
      getE2eRunById({ profileId: "", runId: "run-1" }, db as never),
    ).rejects.toThrow("Profile ID is required");

    await expect(
      getE2eRunById({ profileId: "profile-1", runId: "" }, db as never),
    ).rejects.toThrow("Run ID is required");
  });

  it("returns a selected run summary with duration and step counts", async () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const completedAt = new Date("2026-01-01T00:03:10.000Z");
    e2eRunsFindFirst.mockResolvedValue({
      id: "run-1",
      runNumber: 3,
      profileId: "profile-1",
      status: "completed",
      startedByUser: null,
      startedAt,
      completedAt,
      runSteps: [],
    });
    from
      .mockReturnValueOnce(Promise.resolve([{ total: 5 }]))
      .mockReturnValueOnce({
        where: vi.fn().mockResolvedValue([
          {
            includedSteps: 2,
            passedSteps: "1",
            failedSteps: "1",
          },
        ]),
      });

    await expect(
      getE2eRunById(
        { profileId: "profile-1", runId: "run-1" },
        db as never,
      ),
    ).resolves.toMatchObject({
      id: "run-1",
      summary: {
        includedSteps: 2,
        totalSteps: 5,
        passedSteps: 1,
        failedSteps: 1,
        durationSeconds: 190,
      },
    });
  });

  it("returns null when a selected run does not exist", async () => {
    e2eRunsFindFirst.mockResolvedValue(null);
    from
      .mockReturnValueOnce(Promise.resolve([{ total: 5 }]))
      .mockReturnValueOnce({
        where: vi.fn().mockResolvedValue([{ includedSteps: 0 }]),
      });

    await expect(
      getE2eRunById(
        { profileId: "profile-1", runId: "missing-run" },
        db as never,
      ),
    ).resolves.toBeNull();
  });
});
