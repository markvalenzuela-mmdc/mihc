import fs from "node:fs";
import path from "node:path";
import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  profileBachelorData,
  profileDiscoveryChannels,
  profileDocuments,
  profileEnrollmentData,
  profileLearnerReadiness,
  profileMicrocredentialData,
  profileRelatedPeople,
  profiles,
  profileStudyReasons,
} from "@/lib/drizzle/schema";

type StorageTarget = `${keyof typeof TABLE_COLUMNS}.${string}`;

const TABLE_COLUMNS = {
  profiles: Object.keys(getTableColumns(profiles)),
  profileEnrollmentData: Object.keys(getTableColumns(profileEnrollmentData)),
  profileBachelorData: Object.keys(getTableColumns(profileBachelorData)),
  profileDocuments: Object.keys(getTableColumns(profileDocuments)),
  profileRelatedPeople: Object.keys(getTableColumns(profileRelatedPeople)),
  profileDiscoveryChannels: Object.keys(
    getTableColumns(profileDiscoveryChannels),
  ),
  profileStudyReasons: Object.keys(getTableColumns(profileStudyReasons)),
  profileMicrocredentialData: Object.keys(
    getTableColumns(profileMicrocredentialData),
  ),
  profileLearnerReadiness: Object.keys(
    getTableColumns(profileLearnerReadiness),
  ),
} as const;

const discoveryFields = [
  "Facebook",
  "Instagram",
  "Youtube",
  "Tiktok",
  "Online News Platform",
  "Referred by Family/Relatives",
  "Referred by someone from Mapúa or Malayan",
  "Referred by Friends",
  "Saw a Billboard/Poster Near Me",
  "Visited the Learning Hub",
  "Others",
] as const;

const studyReasonFields = [
  "Accessibility and Location",
  "Affordable Tuition Fees",
  "Learning Hub Facilities and Security",
  "Recommended by parents/relatives/friends",
  "Learning Modality (Online and Face to Face)",
  "Quality of education",
  "Competence of Teachers",
  "School Reputation and Legacy",
] as const;

function addJunctionFields(
  fields: readonly string[],
  target: StorageTarget,
) {
  return Object.fromEntries(fields.map((field) => [field, target]));
}

const BACHELOR_FIELD_STORAGE: Record<string, StorageTarget> = {
  email: "profiles.email",
  termApplied: "profileBachelorData.termOptionId",
  programFocus: "profileBachelorData.majorOptionId",
  programApplied: "profileBachelorData.specializationOptionId",
  givenName: "profileEnrollmentData.givenName",
  middleName: "profileEnrollmentData.middleName",
  familyName: "profileEnrollmentData.familyName",
  suffix: "profileEnrollmentData.suffixOptionId",
  nickname: "profileEnrollmentData.nickname",
  birthplace: "profileEnrollmentData.birthplace",
  birthdate: "profileEnrollmentData.birthdate",
  gender: "profileBachelorData.genderOptionId",
  nationality: "profileEnrollmentData.nationalityOptionId",
  civilStatus: "profileBachelorData.civilStatusOptionId",
  monthlyIncome: "profileBachelorData.monthlyIncomeOptionId",
  mobile: "profileEnrollmentData.mobile",
  landline: "profileEnrollmentData.landline",
  prefLearningHub: "profileBachelorData.learningHubOptionId",
  studentType: "profileBachelorData.studentTypeOptionId",
  subStudentType: "profileBachelorData.subStudentTypeOptionId",
  studentStatus: "profileBachelorData.studentStatusOptionId",
  religion: "profileBachelorData.religionOptionId",
  strand: "profileBachelorData.strandOptionId",
  lastSchoolAttended: "profileBachelorData.lastSchoolAttended",
  schoolNotFound: "profileBachelorData.schoolNotFound",
  lastschOther: "profileBachelorData.lastSchoolOther",
  curraddrCountry: "profileEnrollmentData.currentCountryOptionId",
  curraddrAddrline1: "profileEnrollmentData.currentAddressLine1",
  curraddrAddrline2: "profileEnrollmentData.currentAddressLine2",
  curraddrProvince: "profileEnrollmentData.currentProvinceOptionId",
  curraddrCitymun: "profileEnrollmentData.currentMunicipalityOptionId",
  curraddrBarangay: "profileEnrollmentData.currentBarangayOptionId",
  curraddrZipcode: "profileEnrollmentData.currentAddressZipCode",
  permaddrCountry: "profileBachelorData.permanentCountryOptionId",
  permaddrAddrline1: "profileBachelorData.permanentAddressLine1",
  permaddrAddrline2: "profileBachelorData.permanentAddressLine2",
  permaddrProvince: "profileBachelorData.permanentProvinceOptionId",
  permaddrCitymun: "profileBachelorData.permanentMunicipalityOptionId",
  permaddrBarangay: "profileBachelorData.permanentBarangayOptionId",
  permaddrZipcode: "profileBachelorData.permanentAddressZipCode",
  referrerFirstName: "profileBachelorData.referrerGivenName",
  referrerLastName: "profileBachelorData.referrerFamilyName",
  referrerEmail: "profileBachelorData.referrerEmail",
  interestedForAScholarship:
    "profileBachelorData.scholarshipInterestOptionId",
  scholarship: "profileBachelorData.scholarshipOptionId",
  withMedicalCondition: "profileBachelorData.medicalConditionOptionId",
  PID: "profileDocuments.applicantPersonalIdFixtureUri",
  PHSC: "profileDocuments.proofOfHsCompletionFixtureUri",
  fthrDeceased: "profileRelatedPeople.livingStatusOptionId",
  fthrGivenName: "profileRelatedPeople.givenName",
  fthrMiddleName: "profileRelatedPeople.middleName",
  fthrFamilyName: "profileRelatedPeople.familyName",
  fthrSuffix: "profileRelatedPeople.suffixOptionId",
  fthrBirthdate: "profileRelatedPeople.birthdate",
  fthrLandline: "profileRelatedPeople.landline",
  fthrMobile: "profileRelatedPeople.mobile",
  fthrEmail: "profileRelatedPeople.email",
  fthrOccupation: "profileRelatedPeople.occupation",
  mthrDeceased: "profileRelatedPeople.livingStatusOptionId",
  mthrGivenName: "profileRelatedPeople.givenName",
  mthrMiddleName: "profileRelatedPeople.middleName",
  mthrFamilyName: "profileRelatedPeople.familyName",
  mthrBirthdate: "profileRelatedPeople.birthdate",
  mthrLandline: "profileRelatedPeople.landline",
  mthrMobile: "profileRelatedPeople.mobile",
  mthrEmail: "profileRelatedPeople.email",
  mthrOccupation: "profileRelatedPeople.occupation",
  guardian: "profileBachelorData.guardianAssignmentOptionId",
  grdnGivenName: "profileRelatedPeople.givenName",
  grdnMiddleName: "profileRelatedPeople.middleName",
  grdnFamilyName: "profileRelatedPeople.familyName",
  grdnSuffix: "profileRelatedPeople.suffixOptionId",
  grdnBirthdate: "profileRelatedPeople.birthdate",
  grdnLandline: "profileRelatedPeople.landline",
  grdnMobile: "profileRelatedPeople.mobile",
  grdnEmail: "profileRelatedPeople.email",
  grdnOccupation: "profileRelatedPeople.occupation",
  grdnApplRelationship: "profileRelatedPeople.relationshipOptionId",
  grdnSpecifyApplRelationship: "profileRelatedPeople.relationshipOther",
  ...addJunctionFields(
    discoveryFields,
    "profileDiscoveryChannels.optionId",
  ),
  ...addJunctionFields(studyReasonFields, "profileStudyReasons.optionId"),
};

const MICROCREDENTIAL_FIELD_STORAGE: Record<string, StorageTarget> = {
  givenName: "profileEnrollmentData.givenName",
  middleName: "profileEnrollmentData.middleName",
  familyName: "profileEnrollmentData.familyName",
  suffix: "profileEnrollmentData.suffixOptionId",
  email: "profiles.email",
  birthdate: "profileEnrollmentData.birthdate",
  birthplace: "profileEnrollmentData.birthplace",
  gender: "profileMicrocredentialData.genderOptionId",
  nationality: "profileEnrollmentData.nationalityOptionId",
  civilStatus: "profileMicrocredentialData.civilStatusOptionId",
  studentStatus: "profileMicrocredentialData.studentStatusOptionId",
  monthlyIncome: "profileMicrocredentialData.monthlyIncomeOptionId",
  mobile: "profileEnrollmentData.mobile",
  landline: "profileEnrollmentData.landline",
  tinNumber: "profileMicrocredentialData.tinNumber",
  certificationField: "profileMicrocredentialData.certificationOptionId",
  curraddrCountry: "profileEnrollmentData.currentCountryOptionId",
  curraddrAddrline1: "profileEnrollmentData.currentAddressLine1",
  curraddrAddrline2: "profileEnrollmentData.currentAddressLine2",
  curraddrProvince: "profileEnrollmentData.currentProvinceOptionId",
  curraddrCitymun: "profileEnrollmentData.currentMunicipalityOptionId",
  curraddrBarangay: "profileEnrollmentData.currentBarangayOptionId",
  curraddrZipcode: "profileEnrollmentData.currentAddressZipCode",
  deviceAccess: "profileLearnerReadiness.deviceAccessOptionId",
  internetConnectivity: "profileLearnerReadiness.internetOptionId",
  softwareSkills: "profileLearnerReadiness.softwareSkillsOptionId",
  onlineLearningPlatforms:
    "profileLearnerReadiness.onlinePlatformsOptionId",
  timeCommitment: "profileLearnerReadiness.timeCommitmentOptionId",
  selfDiscipline: "profileLearnerReadiness.selfDisciplineOptionId",
  timeManagement: "profileLearnerReadiness.timeManagementOptionId",
  learningGoals: "profileLearnerReadiness.learningGoalOptionId",
  challenges: "profileLearnerReadiness.potentialChallenges",
  ...addJunctionFields(
    discoveryFields,
    "profileDiscoveryChannels.optionId",
  ),
};

interface RawField {
  name: string;
  conditional_fields?: RawField[];
}

interface RawForm {
  bachelors: {
    steps: { sections?: { fields: RawField[] }[] }[];
  };
  microcredentials: {
    steps: { sections?: { fields: RawField[] }[] }[];
  };
}

function getScrapedFieldNames(
  form: RawForm,
  flow: "bachelors" | "microcredentials",
) {
  return form[flow].steps.flatMap((step) =>
    (step.sections ?? []).flatMap((section) =>
      section.fields.flatMap((field) => [
        field.name,
        ...(field.conditional_fields ?? []).map(({ name }) => name),
      ]),
    ),
  );
}

function expectCompleteStorageMapping(
  scrapedFields: string[],
  storage: Record<string, StorageTarget>,
) {
  expect(Object.keys(storage).sort()).toEqual([...scrapedFields].sort());

  for (const [field, target] of Object.entries(storage)) {
    const [table, column] = target.split(".") as [
      keyof typeof TABLE_COLUMNS,
      string,
    ];
    expect(TABLE_COLUMNS[table], `${field} -> ${target}`).toContain(column);
  }
}

describe("EnrollMate scraped field coverage", () => {
  const sourcePath = path.resolve(
    process.cwd(),
    "../playwright/enrollmate-form-fields.json",
  );
  const form = JSON.parse(fs.readFileSync(sourcePath, "utf8")) as RawForm;

  it("maps every bachelor field to a real typed column or junction", () => {
    expectCompleteStorageMapping(
      getScrapedFieldNames(form, "bachelors"),
      BACHELOR_FIELD_STORAGE,
    );
  });

  it("maps every microcredential field to a real typed column or junction", () => {
    expectCompleteStorageMapping(
      getScrapedFieldNames(form, "microcredentials"),
      MICROCREDENTIAL_FIELD_STORAGE,
    );
  });
});
