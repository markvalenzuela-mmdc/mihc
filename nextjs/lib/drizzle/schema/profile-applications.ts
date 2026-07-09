import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import {
  ENROLLMATE_OPTION_SET_KEYS,
  enrollmateCatalogVersions,
  optionDependencyForeignKey,
  optionMembershipForeignKey,
} from "./enrollmate-catalog";
import { profiles } from "./profiles";

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

function sqlTextLiteral(value: string) {
  return sql.raw(`'${value.replaceAll("'", "''")}'`);
}

export const profileEnrollmentData = pgTable(
  "profile_enrollment_data",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").notNull().unique().references(() => profiles.id),
    catalogVersionId: uuid("catalog_version_id").references(
      () => enrollmateCatalogVersions.id,
    ),
    givenName: text("given_name"),
    familyName: text("family_name"),
    middleName: text("middle_name"),
    nickname: text("nickname"),
    birthplace: text("birthplace"),
    birthdate: date("birthdate"),
    mobile: text("mobile"),
    landline: text("landline"),
    suffix: text("suffix"),
    suffixOptionSetKey: text("suffix_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.suffix),
    suffixOptionId: uuid("suffix_option_id"),
    nationality: text("nationality"),
    nationalityOptionSetKey: text("nationality_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.nationality),
    nationalityOptionId: uuid("nationality_option_id"),
    currentAddressCountry: text("current_address_country"),
    currentAddressLine1: text("current_address_line1"),
    currentAddressLine2: text("current_address_line2"),
    currentAddressProvince: text("current_address_province"),
    currentAddressCity: text("current_address_city"),
    currentAddressBarangay: text("current_address_barangay"),
    currentAddressZipCode: text("current_address_zip_code"),
    currentForeignAddress: text("current_foreign_address"),
    currentCountryOptionSetKey: text("current_country_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.country),
    currentCountryOptionId: uuid("current_country_option_id"),
    currentProvinceOptionSetKey: text("current_province_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.province),
    currentProvinceOptionId: uuid("current_province_option_id"),
    currentMunicipalityOptionSetKey: text("current_municipality_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.municipality),
    currentMunicipalityOptionId: uuid("current_municipality_option_id"),
    currentBarangayOptionSetKey: text("current_barangay_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.barangay),
    currentBarangayOptionId: uuid("current_barangay_option_id"),
    provinceMunicipalityDependencyType: text(
      "province_municipality_dependency_type",
    )
      .notNull()
      .default("province_to_municipality"),
    municipalityBarangayDependencyType: text(
      "municipality_barangay_dependency_type",
    )
      .notNull()
      .default("municipality_to_barangay"),

    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.profileId, table.catalogVersionId],
      foreignColumns: [profiles.id, profiles.catalogVersionId],
    }),
    optionMembershipForeignKey({
      name: "profile_enrollment_data_suffix_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.suffixOptionSetKey,
      optionId: table.suffixOptionId,
    }),
    optionMembershipForeignKey({
      name: "profile_enrollment_data_nationality_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.nationalityOptionSetKey,
      optionId: table.nationalityOptionId,
    }),
    optionMembershipForeignKey({
      name: "profile_enrollment_data_current_country_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.currentCountryOptionSetKey,
      optionId: table.currentCountryOptionId,
    }),
    optionMembershipForeignKey({
      name: "profile_enrollment_data_current_province_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.currentProvinceOptionSetKey,
      optionId: table.currentProvinceOptionId,
    }),
    optionMembershipForeignKey({
      name: "profile_enrollment_data_current_municipality_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.currentMunicipalityOptionSetKey,
      optionId: table.currentMunicipalityOptionId,
    }),
    optionMembershipForeignKey({
      name: "profile_enrollment_data_current_barangay_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.currentBarangayOptionSetKey,
      optionId: table.currentBarangayOptionId,
    }),
    optionDependencyForeignKey({
      name: "profile_enrollment_data_current_province_municipality_fk",
      catalogVersionId: table.catalogVersionId,
      dependencyType: table.provinceMunicipalityDependencyType,
      parentOptionId: table.currentProvinceOptionId,
      childOptionId: table.currentMunicipalityOptionId,
    }),
    optionDependencyForeignKey({
      name: "profile_enrollment_data_current_municipality_barangay_fk",
      catalogVersionId: table.catalogVersionId,
      dependencyType: table.municipalityBarangayDependencyType,
      parentOptionId: table.currentMunicipalityOptionId,
      childOptionId: table.currentBarangayOptionId,
    }),
    check(
      "profile_enrollment_data_option_set_keys_check",
      sql`${table.suffixOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.suffix)}
        and ${table.nationalityOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.nationality)}
        and ${table.currentCountryOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.country)}
        and ${table.currentProvinceOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.province)}
        and ${table.currentMunicipalityOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.municipality)}
        and ${table.currentBarangayOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.barangay)}`,
    ),
  ],
);

export const profileFlows = pgTable(
  "profile_flows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").notNull(),
    catalogVersionId: uuid("catalog_version_id").notNull(),
    flowType: text("flow_type")
      .notNull()
      .$type<"bachelors" | "microcredentials">(),
    ...auditColumns,
  },
  (table) => [
    unique().on(table.profileId, table.flowType),
    unique().on(table.id, table.catalogVersionId),
    unique().on(table.id, table.catalogVersionId, table.flowType),
    foreignKey({
      columns: [table.profileId, table.catalogVersionId],
      foreignColumns: [profiles.id, profiles.catalogVersionId],
    }),
    check(
      "profile_flows_type_check",
      sql`${table.flowType} in ('bachelors', 'microcredentials')`,
    ),
  ],
);

export const profileBachelorData = pgTable(
  "profile_bachelor_data",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileFlowId: uuid("profile_flow_id").notNull().unique(),
    catalogVersionId: uuid("catalog_version_id").notNull(),
    flowType: text("flow_type").notNull().default("bachelors"),
    termOptionSetKey: text("term_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorTerm),
    termOptionId: uuid("term_option_id"),
    genderOptionSetKey: text("gender_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorGender),
    genderOptionId: uuid("gender_option_id"),
    civilStatusOptionSetKey: text("civil_status_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorCivilStatus),
    civilStatusOptionId: uuid("civil_status_option_id"),
    monthlyIncomeOptionSetKey: text("monthly_income_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorMonthlyIncome),
    monthlyIncomeOptionId: uuid("monthly_income_option_id"),
    studentStatusOptionSetKey: text("student_status_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorStudentStatus),
    studentStatusOptionId: uuid("student_status_option_id"),
    majorOptionSetKey: text("major_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorMajor),
    majorOptionId: uuid("major_option_id"),
    specializationOptionSetKey: text("specialization_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorSpecialization),
    specializationOptionId: uuid("specialization_option_id"),
    majorSpecializationDependencyType: text(
      "major_specialization_dependency_type",
    )
      .notNull()
      .default("major_to_specialization"),
    learningHubOptionSetKey: text("learning_hub_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorLearningHub),
    learningHubOptionId: uuid("learning_hub_option_id"),
    studentTypeOptionSetKey: text("student_type_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorStudentType),
    studentTypeOptionId: uuid("student_type_option_id"),
    subStudentTypeOptionSetKey: text("sub_student_type_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorSubStudentType),
    subStudentTypeOptionId: uuid("sub_student_type_option_id"),
    religionOptionSetKey: text("religion_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.religion),
    religionOptionId: uuid("religion_option_id"),
    strandOptionSetKey: text("strand_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorStrand),
    strandOptionId: uuid("strand_option_id"),
    lastSchoolAttended: text("last_school_attended"),
    schoolNotFound: boolean("school_not_found").notNull().default(false),
    lastSchoolOther: text("last_school_other"),
    permanentAddressLine1: text("permanent_address_line_1"),
    permanentAddressLine2: text("permanent_address_line_2"),
    permanentAddressZipCode: text("permanent_address_zip_code"),
    permanentCountryOptionSetKey: text("permanent_country_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.country),
    permanentCountryOptionId: uuid("permanent_country_option_id"),
    permanentProvinceOptionSetKey: text("permanent_province_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.province),
    permanentProvinceOptionId: uuid("permanent_province_option_id"),
    permanentMunicipalityOptionSetKey: text(
      "permanent_municipality_option_set_key",
    )
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.municipality),
    permanentMunicipalityOptionId: uuid("permanent_municipality_option_id"),
    permanentBarangayOptionSetKey: text("permanent_barangay_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.barangay),
    permanentBarangayOptionId: uuid("permanent_barangay_option_id"),
    provinceMunicipalityDependencyType: text(
      "province_municipality_dependency_type",
    )
      .notNull()
      .default("province_to_municipality"),
    municipalityBarangayDependencyType: text(
      "municipality_barangay_dependency_type",
    )
      .notNull()
      .default("municipality_to_barangay"),
    scholarshipInterestOptionSetKey: text(
      "scholarship_interest_option_set_key",
    )
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorScholarshipInterest),
    scholarshipInterestOptionId: uuid("scholarship_interest_option_id"),
    scholarshipOptionSetKey: text("scholarship_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorScholarship),
    scholarshipOptionId: uuid("scholarship_option_id"),
    medicalConditionOptionSetKey: text("medical_condition_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorMedicalCondition),
    medicalConditionOptionId: uuid("medical_condition_option_id"),
    guardianAssignmentOptionSetKey: text(
      "guardian_assignment_option_set_key",
    )
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorGuardianAssignment),
    guardianAssignmentOptionId: uuid("guardian_assignment_option_id"),
    referrerGivenName: text("referrer_given_name"),
    referrerFamilyName: text("referrer_family_name"),
    referrerEmail: text("referrer_email"),
    ...auditColumns,
  },
  (table) => [
    unique().on(table.id, table.catalogVersionId),
    foreignKey({
      columns: [table.profileFlowId, table.catalogVersionId, table.flowType],
      foreignColumns: [
        profileFlows.id,
        profileFlows.catalogVersionId,
        profileFlows.flowType,
      ],
    }),
    ...([
      ["term", table.termOptionSetKey, table.termOptionId],
      ["gender", table.genderOptionSetKey, table.genderOptionId],
      ["civil_status", table.civilStatusOptionSetKey, table.civilStatusOptionId],
      ["monthly_income", table.monthlyIncomeOptionSetKey, table.monthlyIncomeOptionId],
      ["student_status", table.studentStatusOptionSetKey, table.studentStatusOptionId],
      ["major", table.majorOptionSetKey, table.majorOptionId],
      ["specialization", table.specializationOptionSetKey, table.specializationOptionId],
      ["learning_hub", table.learningHubOptionSetKey, table.learningHubOptionId],
      ["student_type", table.studentTypeOptionSetKey, table.studentTypeOptionId],
      ["sub_student_type", table.subStudentTypeOptionSetKey, table.subStudentTypeOptionId],
      ["religion", table.religionOptionSetKey, table.religionOptionId],
      ["strand", table.strandOptionSetKey, table.strandOptionId],
      ["permanent_country", table.permanentCountryOptionSetKey, table.permanentCountryOptionId],
      ["permanent_province", table.permanentProvinceOptionSetKey, table.permanentProvinceOptionId],
      ["permanent_municipality", table.permanentMunicipalityOptionSetKey, table.permanentMunicipalityOptionId],
      ["permanent_barangay", table.permanentBarangayOptionSetKey, table.permanentBarangayOptionId],
      ["scholarship_interest", table.scholarshipInterestOptionSetKey, table.scholarshipInterestOptionId],
      ["scholarship", table.scholarshipOptionSetKey, table.scholarshipOptionId],
      ["medical_condition", table.medicalConditionOptionSetKey, table.medicalConditionOptionId],
      ["guardian_assignment", table.guardianAssignmentOptionSetKey, table.guardianAssignmentOptionId],
    ] as const).map(([name, optionSetKey, optionId]) =>
      optionMembershipForeignKey({
        name: `profile_bachelor_data_${name}_option_fk`,
        catalogVersionId: table.catalogVersionId,
        optionSetKey,
        optionId,
      }),
    ),
    optionDependencyForeignKey({
      name: "profile_bachelor_data_major_specialization_fk",
      catalogVersionId: table.catalogVersionId,
      dependencyType: table.majorSpecializationDependencyType,
      parentOptionId: table.majorOptionId,
      childOptionId: table.specializationOptionId,
    }),
    optionDependencyForeignKey({
      name: "profile_bachelor_data_province_municipality_fk",
      catalogVersionId: table.catalogVersionId,
      dependencyType: table.provinceMunicipalityDependencyType,
      parentOptionId: table.permanentProvinceOptionId,
      childOptionId: table.permanentMunicipalityOptionId,
    }),
    optionDependencyForeignKey({
      name: "profile_bachelor_data_municipality_barangay_fk",
      catalogVersionId: table.catalogVersionId,
      dependencyType: table.municipalityBarangayDependencyType,
      parentOptionId: table.permanentMunicipalityOptionId,
      childOptionId: table.permanentBarangayOptionId,
    }),
    check(
      "profile_bachelor_data_option_sets_check",
      sql`${table.termOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorTerm)}
        and ${table.genderOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorGender)}
        and ${table.civilStatusOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorCivilStatus)}
        and ${table.monthlyIncomeOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorMonthlyIncome)}
        and ${table.studentStatusOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorStudentStatus)}
        and ${table.majorOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorMajor)}
        and ${table.specializationOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorSpecialization)}
        and ${table.learningHubOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorLearningHub)}
        and ${table.studentTypeOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorStudentType)}
        and ${table.subStudentTypeOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorSubStudentType)}
        and ${table.religionOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.religion)}
        and ${table.strandOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorStrand)}
        and ${table.permanentCountryOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.country)}
        and ${table.permanentProvinceOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.province)}
        and ${table.permanentMunicipalityOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.municipality)}
        and ${table.permanentBarangayOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.barangay)}
        and ${table.scholarshipInterestOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorScholarshipInterest)}
        and ${table.scholarshipOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorScholarship)}
        and ${table.medicalConditionOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorMedicalCondition)}
        and ${table.guardianAssignmentOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorGuardianAssignment)}`,
    ),
    check("profile_bachelor_data_flow_type_check", sql`${table.flowType} = 'bachelors'`),
  ],
);

export const profileMicrocredentialData = pgTable(
  "profile_microcredential_data",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileFlowId: uuid("profile_flow_id").notNull().unique(),
    catalogVersionId: uuid("catalog_version_id").notNull(),
    flowType: text("flow_type").notNull().default("microcredentials"),
    genderOptionSetKey: text("gender_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialGender),
    genderOptionId: uuid("gender_option_id"),
    civilStatusOptionSetKey: text("civil_status_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialCivilStatus),
    civilStatusOptionId: uuid("civil_status_option_id"),
    monthlyIncomeOptionSetKey: text("monthly_income_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialMonthlyIncome),
    monthlyIncomeOptionId: uuid("monthly_income_option_id"),
    studentStatusOptionSetKey: text("student_status_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialStudentStatus),
    studentStatusOptionId: uuid("student_status_option_id"),
    certificationOptionSetKey: text("certification_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialCertification),
    certificationOptionId: uuid("certification_option_id"),
    tinNumber: text("tin_number"),
    ...auditColumns,
  },
  (table) => [
    unique().on(table.id, table.catalogVersionId),
    foreignKey({
      columns: [table.profileFlowId, table.catalogVersionId, table.flowType],
      foreignColumns: [
        profileFlows.id,
        profileFlows.catalogVersionId,
        profileFlows.flowType,
      ],
    }),
    ...([
      ["gender", table.genderOptionSetKey, table.genderOptionId],
      ["civil_status", table.civilStatusOptionSetKey, table.civilStatusOptionId],
      ["monthly_income", table.monthlyIncomeOptionSetKey, table.monthlyIncomeOptionId],
      ["student_status", table.studentStatusOptionSetKey, table.studentStatusOptionId],
      ["certification", table.certificationOptionSetKey, table.certificationOptionId],
    ] as const).map(([name, optionSetKey, optionId]) =>
      optionMembershipForeignKey({
        name: `profile_microcredential_data_${name}_option_fk`,
        catalogVersionId: table.catalogVersionId,
        optionSetKey,
        optionId,
      }),
    ),
    check(
      "profile_microcredential_data_option_sets_check",
      sql`${table.genderOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialGender)}
        and ${table.civilStatusOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialCivilStatus)}
        and ${table.monthlyIncomeOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialMonthlyIncome)}
        and ${table.studentStatusOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialStudentStatus)}
        and ${table.certificationOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialCertification)}`,
    ),
    check(
      "profile_microcredential_data_flow_type_check",
      sql`${table.flowType} = 'microcredentials'`,
    ),
  ],
);

export const profileLearnerReadiness = pgTable(
  "profile_learner_readiness",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").notNull().unique().references(() => profiles.id),
    microcredentialDataId: uuid("microcredential_data_id")
      .unique()
      .references(() => profileMicrocredentialData.id),
    catalogVersionId: uuid("catalog_version_id"),
    assistanceNeedScore: integer("assistance_need_score"),
    computerDeviceAccess: text("computer_device_access"),
    onlineLearningPlatforms: text("online_learning_platforms"),
    softwareSkills: text("software_skills"),
    onlinePlatformsSpecified: text("online_platforms_specified"),
    internetConnectivity: text("internet_connectivity"),
    timeCommitment: text("time_commitment"),
    timeManagementEffectiveness: text("time_management_effectiveness"),
    selfDisciplineConfidence: text("self_discipline_confidence"),
    learningGoal: text("learning_goal"),
    challengesProvided: text("challenges_provided"),
    potentialChallenges: text("potential_challenges"),
    deviceAccessOptionSetKey: text("device_access_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialDeviceAccess),
    deviceAccessOptionId: uuid("device_access_option_id"),
    internetOptionSetKey: text("internet_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialInternet),
    internetOptionId: uuid("internet_option_id"),
    softwareSkillsOptionSetKey: text("software_skills_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialSoftwareSkills),
    softwareSkillsOptionId: uuid("software_skills_option_id"),
    onlinePlatformsOptionSetKey: text("online_platforms_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialOnlinePlatforms),
    onlinePlatformsOptionId: uuid("online_platforms_option_id"),
    timeCommitmentOptionSetKey: text("time_commitment_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialTimeCommitment),
    timeCommitmentOptionId: uuid("time_commitment_option_id"),
    selfDisciplineOptionSetKey: text("self_discipline_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialSelfDiscipline),
    selfDisciplineOptionId: uuid("self_discipline_option_id"),
    timeManagementOptionSetKey: text("time_management_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialTimeManagement),
    timeManagementOptionId: uuid("time_management_option_id"),
    learningGoalOptionSetKey: text("learning_goal_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.microcredentialLearningGoals),
    learningGoalOptionId: uuid("learning_goal_option_id"),
    ...auditColumns,
  },
  (table) => [
    foreignKey({
      columns: [table.microcredentialDataId, table.catalogVersionId],
      foreignColumns: [
        profileMicrocredentialData.id,
        profileMicrocredentialData.catalogVersionId,
      ],
    }),
    ...([
      ["device_access", table.deviceAccessOptionSetKey, table.deviceAccessOptionId],
      ["internet", table.internetOptionSetKey, table.internetOptionId],
      ["software_skills", table.softwareSkillsOptionSetKey, table.softwareSkillsOptionId],
      ["online_platforms", table.onlinePlatformsOptionSetKey, table.onlinePlatformsOptionId],
      ["time_commitment", table.timeCommitmentOptionSetKey, table.timeCommitmentOptionId],
      ["self_discipline", table.selfDisciplineOptionSetKey, table.selfDisciplineOptionId],
      ["time_management", table.timeManagementOptionSetKey, table.timeManagementOptionId],
      ["learning_goal", table.learningGoalOptionSetKey, table.learningGoalOptionId],
    ] as const).map(([name, optionSetKey, optionId]) =>
      optionMembershipForeignKey({
        name: `profile_learner_readiness_${name}_option_fk`,
        catalogVersionId: table.catalogVersionId,
        optionSetKey,
        optionId,
      }),
    ),
    check(
      "profile_learner_readiness_option_sets_check",
      sql`${table.deviceAccessOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialDeviceAccess)}
        and ${table.internetOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialInternet)}
        and ${table.softwareSkillsOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialSoftwareSkills)}
        and ${table.onlinePlatformsOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialOnlinePlatforms)}
        and ${table.timeCommitmentOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialTimeCommitment)}
        and ${table.selfDisciplineOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialSelfDiscipline)}
        and ${table.timeManagementOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialTimeManagement)}
        and ${table.learningGoalOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.microcredentialLearningGoals)}`,
    ),
  ],
);

export const profileDocuments = pgTable(
  "profile_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    profileId: uuid("profile_id").notNull().unique().references(() => profiles.id),
    bachelorDataId: uuid("bachelor_data_id")
      .unique()
      .references(() => profileBachelorData.id),
    applicantPersonalIdGDriveLink: text("applicant_personal_id_gdrive_link"),
    proofOfHsCompletionGDriveLink: text("proof_of_hs_completion_gdrive_link"),
    applicantPersonalIdSubmittedDate: date("applicant_personal_id_submitted_date"),
    proofOfHsCompletionSubmittedDate: date("proof_of_hs_completion_submitted_date"),
    applicantPersonalIdFixtureUri: text("applicant_personal_id_fixture_uri"),
    applicantPersonalIdOriginalFilename: text(
      "applicant_personal_id_original_filename",
    ),
    applicantPersonalIdMimeType: text("applicant_personal_id_mime_type"),
    applicantPersonalIdSizeBytes: integer("applicant_personal_id_size_bytes"),
    proofOfHsCompletionFixtureUri: text("proof_of_hs_completion_fixture_uri"),
    proofOfHsCompletionOriginalFilename: text(
      "proof_of_hs_completion_original_filename",
    ),
    proofOfHsCompletionMimeType: text("proof_of_hs_completion_mime_type"),
    proofOfHsCompletionSizeBytes: integer("proof_of_hs_completion_size_bytes"),
    ...auditColumns,
  },
  (table) => [
    check(
      "profile_documents_personal_id_size_check",
      sql`${table.applicantPersonalIdSizeBytes} is null or ${table.applicantPersonalIdSizeBytes} between 0 and 3145728`,
    ),
    check(
      "profile_documents_hs_completion_size_check",
      sql`${table.proofOfHsCompletionSizeBytes} is null or ${table.proofOfHsCompletionSizeBytes} between 0 and 3145728`,
    ),
    check(
      "profile_documents_personal_id_extension_check",
      sql`${table.applicantPersonalIdOriginalFilename} is null or lower(${table.applicantPersonalIdOriginalFilename}) ~ '\\.(pdf|jpe?g|png|xlsx?|docx)$'`,
    ),
    check(
      "profile_documents_hs_completion_extension_check",
      sql`${table.proofOfHsCompletionOriginalFilename} is null or lower(${table.proofOfHsCompletionOriginalFilename}) ~ '\\.(pdf|jpe?g|png|xlsx?|docx)$'`,
    ),
  ],
);

export const profileDiscoveryChannels = pgTable(
  "profile_discovery_channels",
  {
    profileFlowId: uuid("profile_flow_id").notNull(),
    catalogVersionId: uuid("catalog_version_id").notNull(),
    optionSetKey: text("option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.discoveryChannels),
    optionId: uuid("option_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.profileFlowId, table.optionId] }),
    foreignKey({
      columns: [table.profileFlowId, table.catalogVersionId],
      foreignColumns: [profileFlows.id, profileFlows.catalogVersionId],
    }),
    optionMembershipForeignKey({
      name: "profile_discovery_channels_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.optionSetKey,
      optionId: table.optionId,
    }),
    check(
      "profile_discovery_channels_option_set_check",
      sql`${table.optionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.discoveryChannels)}`,
    ),
  ],
);

export const profileStudyReasons = pgTable(
  "profile_study_reasons",
  {
    bachelorDataId: uuid("bachelor_data_id").notNull(),
    catalogVersionId: uuid("catalog_version_id").notNull(),
    optionSetKey: text("option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.bachelorStudyReasons),
    optionId: uuid("option_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.bachelorDataId, table.optionId] }),
    foreignKey({
      columns: [table.bachelorDataId, table.catalogVersionId],
      foreignColumns: [
        profileBachelorData.id,
        profileBachelorData.catalogVersionId,
      ],
    }),
    optionMembershipForeignKey({
      name: "profile_study_reasons_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.optionSetKey,
      optionId: table.optionId,
    }),
    check(
      "profile_study_reasons_option_set_check",
      sql`${table.optionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorStudyReasons)}`,
    ),
  ],
);
