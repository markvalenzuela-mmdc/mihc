import { randomUUID } from "node:crypto";
import { asc, count, eq, getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { useIntegrationTestDatabase } from "@/__tests__/integration/helpers/test-db";
import { getDb } from "@/lib/drizzle/db";
import { ENROLLMATE_OPTION_SET_KEYS } from "@/lib/drizzle/schema/enrollmate-catalog";
import { loadEnrollmateCatalogSource } from "@/lib/drizzle/seed/seed-enrollmate-catalog";
import {
  applicationSnapshots,
  enrollmateCatalogVersions,
  enrollmateOptionDependencies,
  enrollmateOptions,
  enrollmateOptionSets,
  profileBachelorData,
  profileDiscoveryChannels,
  profileDocuments,
  profileEnrollmentData,
  profileFlows,
  profileLearnerReadiness,
  profileMicrocredentialData,
  profileRelatedPeople,
  profileRelatedPersonAddresses,
  profiles,
  profileStudyReasons,
} from "@/lib/drizzle/schema";
import { seedDatabase } from "@/lib/drizzle/seed";

describe("EnrollMate generic catalog and profile schema", () => {
  useIntegrationTestDatabase();

  it("seeds every checked-in UAT set, value, order, and dependency exactly", async () => {
    const db = getDb();
    const source = loadEnrollmateCatalogSource();
    const databaseSets = await db
      .select()
      .from(enrollmateOptionSets)
      .orderBy(asc(enrollmateOptionSets.sortOrder));
    const databaseOptions = await db
      .select()
      .from(enrollmateOptions)
      .orderBy(
        asc(enrollmateOptions.optionSetKey),
        asc(enrollmateOptions.sortOrder),
      );
    const databaseDependencies = await db
      .select()
      .from(enrollmateOptionDependencies);

    expect(databaseSets).toHaveLength(source.optionSets.length);
    expect(
      databaseSets.map(({ key, label, isShared, sortOrder }) => ({
        key,
        label,
        isShared,
        sortOrder,
      })),
    ).toEqual(
      source.optionSets.map(({ key, label, isShared, sortOrder }) => ({
        key,
        label,
        isShared,
        sortOrder,
      })),
    );

    const sourceValues = new Map(
      source.optionSets.map((set) => [
        set.key,
        set.options.map(({ label, submittedValue, sortOrder }) => ({
          label,
          submittedValue,
          sortOrder,
        })),
      ]),
    );
    const databaseValues = new Map<string, {
      label: string;
      submittedValue: string;
      sortOrder: number;
    }[]>();
    for (const option of databaseOptions) {
      const values = databaseValues.get(option.optionSetKey) ?? [];
      values.push({
        label: option.label,
        submittedValue: option.submittedValue,
        sortOrder: option.sortOrder,
      });
      databaseValues.set(option.optionSetKey, values);
    }

    expect(databaseValues).toEqual(sourceValues);
    expect(databaseDependencies).toHaveLength(source.dependencies.length);

    const optionById = new Map(
      databaseOptions.map((option) => [option.id, option]),
    );
    expect(
      databaseDependencies
        .map((dependency) => ({
          type: dependency.dependencyType,
          parentSetKey: optionById.get(dependency.parentOptionId)!.optionSetKey,
          parentValue: optionById.get(dependency.parentOptionId)!.submittedValue,
          childSetKey: optionById.get(dependency.childOptionId)!.optionSetKey,
          childValue: optionById.get(dependency.childOptionId)!.submittedValue,
        }))
        .sort((left, right) =>
          JSON.stringify(left).localeCompare(JSON.stringify(right)),
        ),
    ).toEqual(
      [...source.dependencies].sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      ),
    );
  });

  it("supports both application flows on one shared profile", async () => {
    const db = getDb();
    const profile = await db.query.profiles.findFirst({
      where: (table, { eq }) =>
        eq(table.email, "ari.santos@example.edu"),
      with: {
        flows: {
          with: {
            bachelorData: true,
            microcredentialData: true,
            discoveryChannels: true,
          },
        },
      },
    });

    expect(profile?.flows.map(({ flowType }) => flowType).sort()).toEqual([
      "bachelors",
      "microcredentials",
    ]);
    const bachelorFlow = profile?.flows.find(
      ({ flowType }) => flowType === "bachelors",
    );
    const microcredentialFlow = profile?.flows.find(
      ({ flowType }) => flowType === "microcredentials",
    );

    expect(bachelorFlow?.bachelorData).not.toBeNull();
    expect(bachelorFlow?.microcredentialData).toBeNull();
    expect(microcredentialFlow?.microcredentialData).not.toBeNull();
    expect(microcredentialFlow?.bachelorData).toBeNull();
    expect(bachelorFlow?.discoveryChannels).toHaveLength(2);
    expect(microcredentialFlow?.discoveryChannels).toHaveLength(1);
  });

  it("rejects duplicate flows and flow-specific data on the wrong flow", async () => {
    const db = getDb();
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, "ari.santos@example.edu"));
    const [microcredentialFlow] = await db
      .select()
      .from(profileFlows)
      .where(eq(profileFlows.flowType, "microcredentials"));

    await expect(
      db.insert(profileFlows).values({
        profileId: profile.id,
        catalogVersionId: profile.catalogVersionId!,
        flowType: "bachelors",
      }),
    ).rejects.toThrow();

    await expect(
      db.insert(profileBachelorData).values({
        profileFlowId: microcredentialFlow.id,
        catalogVersionId: microcredentialFlow.catalogVersionId,
      }),
    ).rejects.toThrow();

    const [bachelorFlow] = await db
      .select()
      .from(profileFlows)
      .where(eq(profileFlows.flowType, "bachelors"));
    await expect(
      db.insert(profileMicrocredentialData).values({
        profileFlowId: bachelorFlow.id,
        catalogVersionId: bachelorFlow.catalogVersionId,
      }),
    ).rejects.toThrow();
  });

  it("rejects options from the wrong set and invalid dependency pairs", async () => {
    const db = getDb();
    const [bachelor] = await db.select().from(profileBachelorData);
    const [religion] = await db
      .select()
      .from(enrollmateOptions)
      .where(
        eq(
          enrollmateOptions.optionSetKey,
          ENROLLMATE_OPTION_SET_KEYS.religion,
        ),
      );
    const [businessSpecialization] = await db
      .select()
      .from(enrollmateOptions)
      .where(
        eq(
          enrollmateOptions.submittedValue,
          "BS BA Marketing Management Specialization",
        ),
      );

    await expect(
      db
        .update(profileBachelorData)
        .set({ genderOptionId: religion.id })
        .where(eq(profileBachelorData.id, bachelor.id)),
    ).rejects.toThrow();

    await expect(
      db
        .update(profileBachelorData)
        .set({
          genderOptionSetKey: ENROLLMATE_OPTION_SET_KEYS.religion,
          genderOptionId: religion.id,
        })
        .where(eq(profileBachelorData.id, bachelor.id)),
    ).rejects.toThrow();

    await expect(
      db
        .update(profileBachelorData)
        .set({ specializationOptionId: businessSpecialization.id })
        .where(eq(profileBachelorData.id, bachelor.id)),
    ).rejects.toThrow();
  });

  it("rejects a flow whose catalog version differs from its profile", async () => {
    const db = getDb();
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, "ari.santos@example.edu"));
    const alternateCatalogVersionId = randomUUID();

    await db.insert(enrollmateCatalogVersions).values({
      id: alternateCatalogVersionId,
      sourceVersion: "integration-test",
      referenceDate: "2099-01-01",
      source: "integration-test",
    });

    try {
      await expect(
        db.insert(profileFlows).values({
          profileId: profile.id,
          catalogVersionId: alternateCatalogVersionId,
          flowType: "microcredentials",
        }),
      ).rejects.toThrow();
    } finally {
      await db
        .delete(enrollmateCatalogVersions)
        .where(eq(enrollmateCatalogVersions.id, alternateCatalogVersionId));
    }
  });

  it("rejects an option belonging to another catalog version", async () => {
    const db = getDb();
    const [bachelor] = await db.select().from(profileBachelorData);
    const alternateCatalogVersionId = randomUUID();
    const alternateOptionId = randomUUID();

    await db.insert(enrollmateCatalogVersions).values({
      id: alternateCatalogVersionId,
      sourceVersion: "integration-option-version",
      referenceDate: "2099-01-02",
      source: "integration-test",
    });
    await db.insert(enrollmateOptionSets).values({
      catalogVersionId: alternateCatalogVersionId,
      key: ENROLLMATE_OPTION_SET_KEYS.bachelorGender,
      label: "Bachelor gender",
      isShared: false,
      sortOrder: 1,
    });
    await db.insert(enrollmateOptions).values({
      id: alternateOptionId,
      catalogVersionId: alternateCatalogVersionId,
      optionSetKey: ENROLLMATE_OPTION_SET_KEYS.bachelorGender,
      label: "Female",
      submittedValue: "Female",
      sortOrder: 1,
    });

    try {
      await expect(
        db
          .update(profileBachelorData)
          .set({ genderOptionId: alternateOptionId })
          .where(eq(profileBachelorData.id, bachelor.id)),
      ).rejects.toThrow();
    } finally {
      await db
        .delete(enrollmateOptions)
        .where(eq(enrollmateOptions.id, alternateOptionId));
      await db
        .delete(enrollmateOptionSets)
        .where(
          eq(
            enrollmateOptionSets.catalogVersionId,
            alternateCatalogVersionId,
          ),
        );
      await db
        .delete(enrollmateCatalogVersions)
        .where(eq(enrollmateCatalogVersions.id, alternateCatalogVersionId));
    }
  });

  it("accepts captured geography pairs and rejects uncaptured pairs", async () => {
    const db = getDb();
    const [enrollment] = await db.select().from(profileEnrollmentData);
    const [abra] = await db
      .select()
      .from(enrollmateOptions)
      .where(eq(enrollmateOptions.submittedValue, "Abra"));
    const [tanay] = await db
      .select()
      .from(enrollmateOptions)
      .where(eq(enrollmateOptions.submittedValue, "Tanay"));

    await expect(
      db
        .update(profileEnrollmentData)
        .set({
          currentProvinceOptionId: enrollment.currentProvinceOptionId,
          currentMunicipalityOptionId: enrollment.currentMunicipalityOptionId,
          currentBarangayOptionId: enrollment.currentBarangayOptionId,
        })
        .where(eq(profileEnrollmentData.id, enrollment.id)),
    ).resolves.toBeDefined();

    await expect(
      db
        .update(profileEnrollmentData)
        .set({ currentProvinceOptionId: abra.id })
        .where(eq(profileEnrollmentData.id, enrollment.id)),
    ).rejects.toThrow();

    await expect(
      db
        .update(profileEnrollmentData)
        .set({ currentMunicipalityOptionId: tanay.id })
        .where(eq(profileEnrollmentData.id, enrollment.id)),
    ).rejects.toThrow();
  });

  it("rejects invalid dependency pairs in related-person addresses", async () => {
    const db = getDb();
    const [address] = await db.select().from(profileRelatedPersonAddresses);
    const [tanay] = await db
      .select()
      .from(enrollmateOptions)
      .where(eq(enrollmateOptions.submittedValue, "Tanay"));

    await expect(
      db
        .update(profileRelatedPersonAddresses)
        .set({ municipalityOptionId: tanay.id })
        .where(eq(profileRelatedPersonAddresses.id, address.id)),
    ).rejects.toThrow();
  });

  it("stores relatives, addresses, and bachelor multi-selects relationally", async () => {
    const db = getDb();
    const [bachelor] = await db.select().from(profileBachelorData);
    const people = await db
      .select()
      .from(profileRelatedPeople)
      .where(eq(profileRelatedPeople.bachelorDataId, bachelor.id));
    const addresses = await db.select().from(profileRelatedPersonAddresses);
    const studyReasons = await db
      .select()
      .from(profileStudyReasons)
      .where(eq(profileStudyReasons.bachelorDataId, bachelor.id));

    expect(people.map(({ role }) => role).sort()).toEqual([
      "father",
      "guardian",
      "mother",
    ]);
    expect(
      addresses.filter(({ relatedPersonId }) =>
        people.some(({ id }) => id === relatedPersonId),
      ),
    ).toHaveLength(6);
    expect(studyReasons).toHaveLength(1);
  });

  it("enforces relative roles, option sets, and unique address slots", async () => {
    const db = getDb();
    const [bachelor] = await db.select().from(profileBachelorData);
    const people = await db
      .select()
      .from(profileRelatedPeople)
      .where(eq(profileRelatedPeople.bachelorDataId, bachelor.id));
    const father = people.find(({ role }) => role === "father")!;
    const guardian = people.find(({ role }) => role === "guardian")!;
    const [motherLiving] = await db
      .select()
      .from(enrollmateOptions)
      .where(
        eq(
          enrollmateOptions.optionSetKey,
          ENROLLMATE_OPTION_SET_KEYS.bachelorMotherLivingStatus,
        ),
      );
    const [religion] = await db
      .select()
      .from(enrollmateOptions)
      .where(
        eq(
          enrollmateOptions.optionSetKey,
          ENROLLMATE_OPTION_SET_KEYS.religion,
        ),
      );
    const [bachelorGender] = await db
      .select()
      .from(enrollmateOptions)
      .where(
        eq(
          enrollmateOptions.optionSetKey,
          ENROLLMATE_OPTION_SET_KEYS.bachelorGender,
        ),
      );

    await expect(
      db.insert(profileRelatedPeople).values({
        bachelorDataId: bachelor.id,
        catalogVersionId: bachelor.catalogVersionId,
        role: "father",
        livingStatusOptionSetKey:
          ENROLLMATE_OPTION_SET_KEYS.bachelorFatherLivingStatus,
        livingStatusOptionId: father.livingStatusOptionId,
      }),
    ).rejects.toThrow();

    await expect(
      db
        .update(profileRelatedPeople)
        .set({
          livingStatusOptionSetKey:
            ENROLLMATE_OPTION_SET_KEYS.bachelorMotherLivingStatus,
          livingStatusOptionId: motherLiving.id,
        })
        .where(eq(profileRelatedPeople.id, father.id)),
    ).rejects.toThrow();

    await expect(
      db
        .update(profileRelatedPeople)
        .set({
          suffixOptionSetKey: ENROLLMATE_OPTION_SET_KEYS.religion,
          suffixOptionId: religion.id,
        })
        .where(eq(profileRelatedPeople.id, father.id)),
    ).rejects.toThrow();

    await expect(
      db
        .update(profileRelatedPeople)
        .set({
          relationshipOptionSetKey:
            ENROLLMATE_OPTION_SET_KEYS.bachelorGender,
          relationshipOptionId: bachelorGender.id,
        })
        .where(eq(profileRelatedPeople.id, guardian.id)),
    ).rejects.toThrow();

    await expect(
      db.insert(profileRelatedPersonAddresses).values({
        relatedPersonId: father.id,
        catalogVersionId: father.catalogVersionId,
        addressType: "current",
      }),
    ).rejects.toThrow();
  });

  it("keeps relatives, study reasons, and readiness on their canonical flow data", async () => {
    const db = getDb();
    const [microcredential] = await db
      .select()
      .from(profileMicrocredentialData);
    const [studyReason] = await db.select().from(profileStudyReasons);
    const profileWithoutReadiness = await db.query.profiles.findFirst({
      where: (table, { eq }) => eq(table.email, "mika.reyes@example.edu"),
    });

    await expect(
      db.insert(profileRelatedPeople).values({
        bachelorDataId: microcredential.id,
        catalogVersionId: microcredential.catalogVersionId,
        role: "father",
        livingStatusOptionSetKey:
          ENROLLMATE_OPTION_SET_KEYS.bachelorFatherLivingStatus,
      }),
    ).rejects.toThrow();

    await expect(
      db.insert(profileStudyReasons).values({
        bachelorDataId: microcredential.id,
        catalogVersionId: microcredential.catalogVersionId,
        optionId: studyReason.optionId,
      }),
    ).rejects.toThrow();

    await expect(
      db.insert(profileLearnerReadiness).values({
        profileId: profileWithoutReadiness!.id,
        microcredentialDataId: randomUUID(),
        catalogVersionId: profileWithoutReadiness!.catalogVersionId,
      }),
    ).rejects.toThrow();
  });

  it("enforces document constraints declared in the Drizzle schema", async () => {
    const db = getDb();
    const [document] = await db.select().from(profileDocuments);

    await expect(
      db
        .update(profileDocuments)
        .set({
          applicantPersonalIdOriginalFilename: "applicant.pdf",
          applicantPersonalIdSizeBytes: 3_145_729,
        })
        .where(eq(profileDocuments.id, document.id)),
    ).rejects.toThrow();

    await expect(
      db
        .update(profileDocuments)
        .set({
          applicantPersonalIdOriginalFilename: "applicant.exe",
          applicantPersonalIdSizeBytes: 1_024,
        })
        .where(eq(profileDocuments.id, document.id)),
    ).rejects.toThrow();

    await expect(
      db
        .update(profileDocuments)
        .set({
          proofOfHsCompletionOriginalFilename: "transcript.pdf",
          proofOfHsCompletionSizeBytes: 3_145_729,
        })
        .where(eq(profileDocuments.id, document.id)),
    ).rejects.toThrow();

    await expect(
      db
        .update(profileDocuments)
        .set({
          proofOfHsCompletionOriginalFilename: "transcript.zip",
          proofOfHsCompletionSizeBytes: 1_024,
        })
        .where(eq(profileDocuments.id, document.id)),
    ).rejects.toThrow();
  });

  it("round-trips immutable raw snapshots with their catalog version", async () => {
    const db = getDb();
    const [flow] = await db.select().from(profileFlows);
    const snapshotId = randomUUID();
    const rawPayload = {
      email: "ari.santos@example.edu",
      programFocus: "BS Information Technology",
    };

    await db.insert(applicationSnapshots).values({
      id: snapshotId,
      profileFlowId: flow.id,
      catalogVersionId: flow.catalogVersionId,
      payloadHash: "sha256:test-payload",
      rawPayload,
    });

    const [snapshot] = await db
      .select()
      .from(applicationSnapshots)
      .where(eq(applicationSnapshots.id, snapshotId));

    expect(snapshot.rawPayload).toEqual(rawPayload);
    expect(snapshot.catalogVersionId).toBe(flow.catalogVersionId);
    expect(snapshot.payloadHash).toBe("sha256:test-payload");
    expect(getTableColumns(applicationSnapshots)).not.toHaveProperty(
      "updatedAt",
    );
  });

  it("keeps catalog and flow counts stable across repeated seeds", async () => {
    const db = getDb();
    const getCounts = async () => {
      const [[catalogs], [sets], [options], [dependencies], [flows]] =
        await Promise.all([
          db.select({ total: count() }).from(enrollmateCatalogVersions),
          db.select({ total: count() }).from(enrollmateOptionSets),
          db.select({ total: count() }).from(enrollmateOptions),
          db.select({ total: count() }).from(enrollmateOptionDependencies),
          db.select({ total: count() }).from(profileFlows),
        ]);

      return [
        Number(catalogs.total),
        Number(sets.total),
        Number(options.total),
        Number(dependencies.total),
        Number(flows.total),
      ];
    };
    const before = await getCounts();

    await seedDatabase();

    expect(await getCounts()).toEqual(before);
  });

  it("uses field-specific gender sets for the two flow records", async () => {
    const db = getDb();
    const [bachelor] = await db.select().from(profileBachelorData);
    const [microcredential] = await db
      .select()
      .from(profileMicrocredentialData);

    expect(bachelor.genderOptionSetKey).toBe(
      ENROLLMATE_OPTION_SET_KEYS.bachelorGender,
    );
    expect(microcredential.genderOptionSetKey).toBe(
      ENROLLMATE_OPTION_SET_KEYS.microcredentialGender,
    );
    expect(bachelor.genderOptionSetKey).not.toBe(
      microcredential.genderOptionSetKey,
    );

    const channels = await db.select().from(profileDiscoveryChannels);
    expect(channels).not.toHaveLength(0);
  });
});
