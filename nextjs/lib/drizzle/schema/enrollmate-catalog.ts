import { sql } from "drizzle-orm";
import {
  AnyPgColumn,
  boolean,
  check,
  date,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const ENROLLMATE_OPTION_SET_KEYS = {
  suffix: "shared.suffix",
  country: "shared.country",
  province: "shared.province",
  municipality: "shared.municipality",
  barangay: "shared.barangay",
  nationality: "shared.nationality",
  religion: "shared.religion",
  discoveryChannels: "shared.discoveryChannels",
  bachelorGender: "bachelors.gender",
  bachelorCivilStatus: "bachelors.civilStatus",
  bachelorMonthlyIncome: "bachelors.monthlyIncome",
  bachelorStudentStatus: "bachelors.studentStatus",
  bachelorTerm: "bachelors.termApplied",
  bachelorMajor: "bachelors.programFocus",
  bachelorSpecialization: "bachelors.programApplied",
  bachelorLearningHub: "bachelors.prefLearningHub",
  bachelorStudentType: "bachelors.studentType",
  bachelorSubStudentType: "bachelors.subStudentType",
  bachelorStrand: "bachelors.strand",
  bachelorScholarshipInterest: "bachelors.interestedForAScholarship",
  bachelorScholarship: "bachelors.scholarship",
  bachelorMedicalCondition: "bachelors.withMedicalCondition",
  bachelorFatherLivingStatus: "bachelors.fthrDeceased",
  bachelorMotherLivingStatus: "bachelors.mthrDeceased",
  bachelorGuardianAssignment: "bachelors.guardian",
  bachelorGuardianRelationship: "bachelors.grdnApplRelationship",
  bachelorStudyReasons: "bachelors.studyReasons",
  microcredentialGender: "microcredentials.gender",
  microcredentialCivilStatus: "microcredentials.civilStatus",
  microcredentialMonthlyIncome: "microcredentials.monthlyIncome",
  microcredentialStudentStatus: "microcredentials.studentStatus",
  microcredentialCertification: "microcredentials.certificationField",
  microcredentialDeviceAccess: "microcredentials.deviceAccess",
  microcredentialInternet: "microcredentials.internetConnectivity",
  microcredentialSoftwareSkills: "microcredentials.softwareSkills",
  microcredentialOnlinePlatforms: "microcredentials.onlineLearningPlatforms",
  microcredentialTimeCommitment: "microcredentials.timeCommitment",
  microcredentialSelfDiscipline: "microcredentials.selfDiscipline",
  microcredentialTimeManagement: "microcredentials.timeManagement",
  microcredentialLearningGoals: "microcredentials.learningGoals",
} as const;

export type EnrollmateOptionSetKey =
  (typeof ENROLLMATE_OPTION_SET_KEYS)[keyof typeof ENROLLMATE_OPTION_SET_KEYS];

export type EnrollmateDependencyType =
  | "major_to_specialization"
  | "province_to_municipality"
  | "municipality_to_barangay";

export const enrollmateCatalogVersions = pgTable(
  "enrollmate_catalog_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceVersion: text("source_version").notNull(),
    referenceDate: date("reference_date").notNull(),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique().on(table.sourceVersion, table.referenceDate),
    unique().on(table.id, table.sourceVersion),
  ],
);

export const enrollmateOptionSets = pgTable(
  "enrollmate_option_sets",
  {
    catalogVersionId: uuid("catalog_version_id")
      .notNull()
      .references(() => enrollmateCatalogVersions.id),
    key: text("key").notNull(),
    label: text("label").notNull(),
    isShared: boolean("is_shared").notNull().default(false),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.catalogVersionId, table.key] }),
  ],
);

export const enrollmateOptions = pgTable(
  "enrollmate_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    catalogVersionId: uuid("catalog_version_id").notNull(),
    optionSetKey: text("option_set_key").notNull(),
    label: text("label").notNull(),
    submittedValue: text("submitted_value").notNull(),
    sortOrder: integer("sort_order").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    foreignKey({
      columns: [table.catalogVersionId, table.optionSetKey],
      foreignColumns: [
        enrollmateOptionSets.catalogVersionId,
        enrollmateOptionSets.key,
      ],
    }),
    unique().on(
      table.catalogVersionId,
      table.optionSetKey,
      table.submittedValue,
    ),
    unique().on(table.catalogVersionId, table.optionSetKey, table.id),
    unique().on(table.catalogVersionId, table.id),
  ],
);

export const enrollmateOptionDependencies = pgTable(
  "enrollmate_option_dependencies",
  {
    catalogVersionId: uuid("catalog_version_id").notNull(),
    dependencyType: text("dependency_type")
      .notNull()
      .$type<EnrollmateDependencyType>(),
    parentOptionId: uuid("parent_option_id").notNull(),
    childOptionId: uuid("child_option_id").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [
        table.catalogVersionId,
        table.dependencyType,
        table.parentOptionId,
        table.childOptionId,
      ],
    }),
    foreignKey({
      columns: [table.catalogVersionId, table.parentOptionId],
      foreignColumns: [
        enrollmateOptions.catalogVersionId,
        enrollmateOptions.id,
      ],
    }),
    foreignKey({
      columns: [table.catalogVersionId, table.childOptionId],
      foreignColumns: [
        enrollmateOptions.catalogVersionId,
        enrollmateOptions.id,
      ],
    }),
    check(
      "enrollmate_option_dependencies_type_check",
      sql`${table.dependencyType} in ('major_to_specialization', 'province_to_municipality', 'municipality_to_barangay')`,
    ),
    check(
      "enrollmate_option_dependencies_distinct_options_check",
      sql`${table.parentOptionId} <> ${table.childOptionId}`,
    ),
  ],
);

export function optionMembershipForeignKey({
  name,
  catalogVersionId,
  optionSetKey,
  optionId,
}: {
  name: string;
  catalogVersionId: AnyPgColumn;
  optionSetKey: AnyPgColumn;
  optionId: AnyPgColumn;
}) {
  return foreignKey({
    name,
    columns: [catalogVersionId, optionSetKey, optionId],
    foreignColumns: [
      enrollmateOptions.catalogVersionId,
      enrollmateOptions.optionSetKey,
      enrollmateOptions.id,
    ],
  });
}

export function optionDependencyForeignKey({
  name,
  catalogVersionId,
  dependencyType,
  parentOptionId,
  childOptionId,
}: {
  name: string;
  catalogVersionId: AnyPgColumn;
  dependencyType: AnyPgColumn;
  parentOptionId: AnyPgColumn;
  childOptionId: AnyPgColumn;
}) {
  return foreignKey({
    name,
    columns: [
      catalogVersionId,
      dependencyType,
      parentOptionId,
      childOptionId,
    ],
    foreignColumns: [
      enrollmateOptionDependencies.catalogVersionId,
      enrollmateOptionDependencies.dependencyType,
      enrollmateOptionDependencies.parentOptionId,
      enrollmateOptionDependencies.childOptionId,
    ],
  });
}
