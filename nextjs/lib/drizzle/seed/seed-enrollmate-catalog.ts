import { createHash } from "node:crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { ENROLLMATE_OPTION_SET_KEYS } from "../schema/enrollmate-catalog";
import type { EnrollmateOptionSetKey } from "../schema/enrollmate-catalog";
import {
  enrollmateCatalogVersions,
  enrollmateOptionDependencies,
  enrollmateOptions,
  enrollmateOptionSets,
} from "../schema";
import type * as schema from "../schema";
import { bachelorSteps } from "./data/bachelor-options";
import { microcredentialSteps } from "./data/microcredential-options";
import {
  antipoloBarangays,
  countries,
  provinces,
  rizalMunicipalities,
  tanayBarangays,
} from "./data/locations";
import {
  discoveryChannels,
  nationalities,
  religions,
  studyReasons,
} from "./data/reference";

export interface CatalogOption {
  label: string;
  submittedValue: string;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
}

export interface CatalogOptionSet {
  key: EnrollmateOptionSetKey;
  label: string;
  isShared: boolean;
  sortOrder: number;
  options: CatalogOption[];
}

export type CatalogDependencyType =
  | "major_to_specialization"
  | "province_to_municipality"
  | "municipality_to_barangay";

export interface CatalogDependency {
  type: CatalogDependencyType;
  parentSetKey: EnrollmateOptionSetKey;
  parentValue: string;
  childSetKey: EnrollmateOptionSetKey;
  childValue: string;
}

export interface EnrollmateCatalogSource {
  version: string;
  referenceDate: string;
  source: string;
  optionSets: CatalogOptionSet[];
  dependencies: CatalogDependency[];
}

function opt(label: string): CatalogOption {
  return { label, submittedValue: label, sortOrder: 0, metadata: null };
}

function set(
  key: EnrollmateOptionSetKey,
  label: string,
  isShared: boolean,
  ...options: CatalogOption[]
): Omit<CatalogOptionSet, "sortOrder"> {
  return {
    key,
    label,
    isShared,
    options: options.map((o, i) => ({ ...o, sortOrder: i + 1 })),
  };
}

export function loadEnrollmateCatalogSource(): EnrollmateCatalogSource {
  const specSets = bachelorSteps.specialization.flatMap(({ children }) => children.map(opt));

  const optionSets: CatalogOptionSet[] = [
    { ...set(ENROLLMATE_OPTION_SET_KEYS.suffix, "Suffix", true, ...bachelorSteps.suffix.map(opt)), sortOrder: 1 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.country, "Country", true, ...countries.map(opt)), sortOrder: 2 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.province, "Province", true, ...provinces.map(opt)), sortOrder: 3 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.municipality, "Municipality", true, ...rizalMunicipalities.map(opt)), sortOrder: 4 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.barangay, "Barangay", true, ...[...new Set([...antipoloBarangays, ...tanayBarangays])].map(opt)), sortOrder: 5 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.nationality, "Nationality", true, ...nationalities.map(opt)), sortOrder: 6 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.religion, "Religion", true, ...religions.map(opt)), sortOrder: 7 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.discoveryChannels, "How did you find out about MMDC?", true, ...discoveryChannels.map(opt)), sortOrder: 8 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorGender, "Gender", false, ...bachelorSteps.gender.map(opt)), sortOrder: 9 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorCivilStatus, "Civil Status", false, ...bachelorSteps.civilStatus.map(opt)), sortOrder: 10 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorMonthlyIncome, "Combined Household Monthly Income (Php)", false, ...bachelorSteps.monthlyIncome.map(opt)), sortOrder: 11 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorStudentStatus, "Student Status", false, ...bachelorSteps.studentStatus.map(opt)), sortOrder: 12 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorTerm, "Term Applied", false, ...bachelorSteps.termApplied.map(opt)), sortOrder: 13 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorMajor, "Major", false, ...bachelorSteps.programFocus.map(opt)), sortOrder: 14 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorSpecialization, "Specialization", false, ...specSets), sortOrder: 15 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorLearningHub, "Preferred Learning Hub", false, ...bachelorSteps.learningHub.map(opt)), sortOrder: 16 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorStudentType, "Student Type", false, ...bachelorSteps.studentType.map(opt)), sortOrder: 17 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorSubStudentType, "Sub Student Type", false, ...bachelorSteps.subStudentType.map(opt)), sortOrder: 18 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorStrand, "Current/Completed Strand/Program", false, ...bachelorSteps.strand.map(opt)), sortOrder: 19 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorScholarshipInterest, "Interested to apply for a Scholarship?", false, ...bachelorSteps.yesNo.map(opt)), sortOrder: 20 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorScholarship, "Scholarship", false, ...bachelorSteps.scholarship.map(opt)), sortOrder: 21 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorMedicalCondition, "Have you ever been diagnosed with any medical, psychological, or learning difficulty?", false, ...bachelorSteps.yesNo.map(opt)), sortOrder: 22 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorFatherLivingStatus, "Living Status", false, ...bachelorSteps.livingStatus.map(opt)), sortOrder: 23 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorMotherLivingStatus, "Living Status", false, ...bachelorSteps.livingStatus.map(opt)), sortOrder: 24 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorGuardianAssignment, "Who do you want to assign as your guardian?", false, ...bachelorSteps.guardianAssignment.map(opt)), sortOrder: 25 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorGuardianRelationship, "Relationship to Applicant", false, ...bachelorSteps.guardianRelationship.map(opt)), sortOrder: 26 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.bachelorStudyReasons, "Why do you want to study in MMDC?", false, ...studyReasons.map(opt)), sortOrder: 27 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialGender, "Gender", false, ...bachelorSteps.gender.map(opt)), sortOrder: 28 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialCivilStatus, "Civil Status", false, ...bachelorSteps.civilStatus.map(opt)), sortOrder: 29 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialMonthlyIncome, "Combined Household Monthly Income (Php)", false, ...bachelorSteps.monthlyIncome.map(opt)), sortOrder: 30 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialStudentStatus, "Student Status", false, ...bachelorSteps.studentStatus.map(opt)), sortOrder: 31 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialCertification, "Certification Field", false, ...microcredentialSteps.certificationField.map(opt)), sortOrder: 32 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialDeviceAccess, "Do you have regular access to a computer/laptop/tablet/smartphone to be used for online learning?", false, ...bachelorSteps.yesNo.map(opt)), sortOrder: 33 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialInternet, "Do you have reliable internet access where you plan to take the Certification Program(s)?", false, ...bachelorSteps.yesNo.map(opt)), sortOrder: 34 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialSoftwareSkills, "Are you familiar with using basic computer software such as web browsers, word processors, spreadsheets, and email?", false, ...bachelorSteps.yesNo.map(opt)), sortOrder: 35 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialOnlinePlatforms, "Have you used online learning platforms before?", false, ...bachelorSteps.yesNo.map(opt)), sortOrder: 36 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialTimeCommitment, "How many hours per week are you willing to dedicate to online learning?", false, ...microcredentialSteps.timeCommitment.map(opt)), sortOrder: 37 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialSelfDiscipline, "How confident are you in your ability to stay focused and motivated when working independently?", false, ...microcredentialSteps.selfDiscipline.map(opt)), sortOrder: 38 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialTimeManagement, "How effective are you at managing your time and prioritizing tasks?", false, ...microcredentialSteps.timeManagement.map(opt)), sortOrder: 39 },
    { ...set(ENROLLMATE_OPTION_SET_KEYS.microcredentialLearningGoals, "What is your primary learning goal for enrolling in this program?", false, ...microcredentialSteps.learningGoals.map(opt)), sortOrder: 40 },
  ];

  const dependencies: CatalogDependency[] = [
    ...bachelorSteps.specialization.flatMap(({ parent, children }) =>
      children.map((child) => ({
        type: "major_to_specialization" as const,
        parentSetKey: ENROLLMATE_OPTION_SET_KEYS.bachelorMajor,
        parentValue: parent,
        childSetKey: ENROLLMATE_OPTION_SET_KEYS.bachelorSpecialization,
        childValue: child,
      })),
    ),
    ...rizalMunicipalities.map((child) => ({
      type: "province_to_municipality" as const,
      parentSetKey: ENROLLMATE_OPTION_SET_KEYS.province,
      parentValue: "Rizal",
      childSetKey: ENROLLMATE_OPTION_SET_KEYS.municipality,
      childValue: child,
    })),
    ...antipoloBarangays.map((child) => ({
      type: "municipality_to_barangay" as const,
      parentSetKey: ENROLLMATE_OPTION_SET_KEYS.municipality,
      parentValue: "Antipolo City",
      childSetKey: ENROLLMATE_OPTION_SET_KEYS.barangay,
      childValue: child,
    })),
    ...tanayBarangays.map((child) => ({
      type: "municipality_to_barangay" as const,
      parentSetKey: ENROLLMATE_OPTION_SET_KEYS.municipality,
      parentValue: "Tanay",
      childSetKey: ENROLLMATE_OPTION_SET_KEYS.barangay,
      childValue: child,
    })),
  ];

  return {
    version: "1.8.3",
    referenceDate: "2026-07-08",
    source: "UAT EnrollMate form — Playwright scrape 2026-07-08",
    optionSets,
    dependencies,
  };
}

function getDeterministicUuid(value: string) {
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hash[12] = "5";
  hash[16] = ((Number.parseInt(hash[16], 16) & 0x3) | 0x8).toString(16);

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20),
  ]
    .map((part) => part.join(""))
    .join("-");
}

export function getCatalogVersionId(source: EnrollmateCatalogSource) {
  return getDeterministicUuid(
    `enrollmate-catalog:${source.version}:${source.referenceDate}`,
  );
}

export function getOptionId(
  version: string,
  setKey: string,
  submittedValue: string,
) {
  return getDeterministicUuid(
    `enrollmate-option:${version}:${setKey}:${submittedValue}`,
  );
}

export function requireOptionId(
  optionIndex: Map<string, string>,
  setKey: string,
  submittedValue: string | null,
) {
  if (submittedValue === null) return null;

  const optionId = optionIndex.get(`${setKey}\0${submittedValue}`);
  if (!optionId) {
    throw new Error(
      `Unknown EnrollMate option "${submittedValue}" for set "${setKey}"`,
    );
  }

  return optionId;
}

export async function seedEnrollmateCatalog(
  tx: NodePgDatabase<typeof schema>,
) {
  const source = loadEnrollmateCatalogSource();
  const catalogVersionId = getCatalogVersionId(source);
  const optionIndex = new Map<string, string>();

  await tx
    .insert(enrollmateCatalogVersions)
    .values({
      id: catalogVersionId,
      sourceVersion: source.version,
      referenceDate: source.referenceDate,
      source: source.source,
    })
    .onConflictDoUpdate({
      target: [
        enrollmateCatalogVersions.sourceVersion,
        enrollmateCatalogVersions.referenceDate,
      ],
      set: { source: source.source },
    });

  for (const optionSet of source.optionSets) {
    await tx
      .insert(enrollmateOptionSets)
      .values({
        catalogVersionId,
        key: optionSet.key,
        label: optionSet.label,
        isShared: optionSet.isShared,
        sortOrder: optionSet.sortOrder,
      })
      .onConflictDoUpdate({
        target: [
          enrollmateOptionSets.catalogVersionId,
          enrollmateOptionSets.key,
        ],
        set: {
          label: optionSet.label,
          isShared: optionSet.isShared,
          sortOrder: optionSet.sortOrder,
        },
      });

    for (const option of optionSet.options) {
      const optionId = getOptionId(
        catalogVersionId,
        optionSet.key,
        option.submittedValue,
      );
      optionIndex.set(`${optionSet.key}\0${option.submittedValue}`, optionId);

      await tx
        .insert(enrollmateOptions)
        .values({
          id: optionId,
          catalogVersionId,
          optionSetKey: optionSet.key,
          label: option.label,
          submittedValue: option.submittedValue,
          sortOrder: option.sortOrder,
          isActive: true,
          metadata: option.metadata,
        })
        .onConflictDoUpdate({
          target: enrollmateOptions.id,
          set: {
            label: option.label,
            sortOrder: option.sortOrder,
            isActive: true,
            metadata: option.metadata,
          },
        });
    }
  }

  for (const dependency of source.dependencies) {
    await tx
      .insert(enrollmateOptionDependencies)
      .values({
        catalogVersionId,
        dependencyType: dependency.type,
        parentOptionId: requireOptionId(
          optionIndex,
          dependency.parentSetKey,
          dependency.parentValue,
        )!,
        childOptionId: requireOptionId(
          optionIndex,
          dependency.childSetKey,
          dependency.childValue,
        )!,
      })
      .onConflictDoNothing();
  }

  return { source, catalogVersionId, optionIndex };
}
