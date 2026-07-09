import type {
  E2eProfileCatalogOption,
  E2eProfileWorkspaceProfile,
} from "../../types/e2e-testing.types";

export type ProfileSheetSource = Pick<
  E2eProfileWorkspaceProfile,
  | "name"
  | "middleName"
  | "email"
  | "program"
  | "cohort"
  | "status"
  | "catalogOptions"
  | "enrollmentData"
  | "learnerReadiness"
  | "paymentDetails"
  | "studyBuddy"
  | "documents"
  | "additionalInfo"
  | "disclosures"
  | "systemInfo"
  | "flows"
>;

export type ProfileSheetFieldValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

export type ProfileSheetField = {
  label: string;
  value: ProfileSheetFieldValue;
};

export type ProfileSheetGroup = {
  label: string;
  fields: ProfileSheetField[];
};

type BachelorFlow = ProfileSheetSource["flows"][number];
type MicrocredentialFlow = ProfileSheetSource["flows"][number];
type BachelorData = NonNullable<BachelorFlow["bachelorData"]>;
type MicrocredentialData = NonNullable<
  MicrocredentialFlow["microcredentialData"]
>;
type LearnerReadiness = NonNullable<ProfileSheetSource["learnerReadiness"]>;
type Documents = NonNullable<ProfileSheetSource["documents"]>;
type PaymentDetails = NonNullable<ProfileSheetSource["paymentDetails"]>;
type StudyBuddy = NonNullable<ProfileSheetSource["studyBuddy"]>;
type AdditionalInfo = NonNullable<ProfileSheetSource["additionalInfo"]>;
type Disclosures = NonNullable<ProfileSheetSource["disclosures"]>;
type SystemInfo = NonNullable<ProfileSheetSource["systemInfo"]>;

type SheetFormatters = {
  optionValue: (optionId: string | null, fallback?: string | null) => string | null;
  formatAddress: (...parts: ProfileSheetFieldValue[]) => string | null;
  formatName: (...parts: (string | null | undefined)[]) => string | null;
  formatJoinedOptions: (
    options: { option: E2eProfileCatalogOption | null }[],
  ) => string | null;
};

function formatCatalogOption(option: E2eProfileCatalogOption | null | undefined) {
  if (!option) return null;
  if (option.label === option.submittedValue) return option.label;
  return `${option.label} (${option.submittedValue})`;
}

function createSheetFormatters(profile: ProfileSheetSource): SheetFormatters {
  const options = new Map(
    profile.catalogOptions.map((option) => [option.id, option]),
  );

  function optionValue(optionId: string | null, fallback?: string | null) {
    return formatCatalogOption(optionId ? options.get(optionId) : null) ??
      fallback ??
      null;
  }

  function formatAddress(...parts: ProfileSheetFieldValue[]) {
    return parts
      .filter((part) => part !== null && part !== undefined && part !== "")
      .map((part) => String(part))
      .join(", ") || null;
  }

  function formatName(...parts: (string | null | undefined)[]) {
    return parts.filter(Boolean).join(" ") || null;
  }

  function formatJoinedOptions(
    options: { option: E2eProfileCatalogOption | null }[],
  ) {
    const values = options
      .map(({ option }) => formatCatalogOption(option))
      .filter(Boolean);
    return values.join(", ") || null;
  }

  return {
    optionValue,
    formatAddress,
    formatName,
    formatJoinedOptions,
  };
}

function getBaseProfileGroups(
  profile: ProfileSheetSource,
  { optionValue }: SheetFormatters,
): ProfileSheetGroup[] {
  const data = profile.enrollmentData;

  return [
    {
      label: "Profile",
      fields: [
        { label: "Name", value: profile.name },
        { label: "Middle name", value: profile.middleName },
        { label: "Email", value: profile.email },
        { label: "Program", value: profile.program },
        { label: "Cohort", value: profile.cohort },
        { label: "Status", value: profile.status },
      ],
    },
    {
      label: "Student",
      fields: [
        { label: "Given name", value: data.givenName },
        { label: "Family name", value: data.familyName },
        { label: "Middle name", value: data.middleName },
        { label: "Nickname", value: data.nickname },
        {
          label: "Suffix",
          value: optionValue(data.suffixOptionId, data.suffix),
        },
        { label: "Birthdate", value: data.birthdate },
        { label: "Birthplace", value: data.birthplace },
        {
          label: "Nationality",
          value: optionValue(data.nationalityOptionId, data.nationality),
        },
        { label: "Mobile", value: data.mobile },
        { label: "Landline", value: data.landline },
      ],
    },
    {
      label: "Current address",
      fields: [
        {
          label: "Country",
          value: optionValue(
            data.currentCountryOptionId,
            data.currentAddressCountry,
          ),
        },
        { label: "Line 1", value: data.currentAddressLine1 },
        { label: "Line 2", value: data.currentAddressLine2 },
        {
          label: "Province",
          value: optionValue(
            data.currentProvinceOptionId,
            data.currentAddressProvince,
          ),
        },
        {
          label: "City/municipality",
          value: optionValue(
            data.currentMunicipalityOptionId,
            data.currentAddressCity,
          ),
        },
        {
          label: "Barangay",
          value: optionValue(
            data.currentBarangayOptionId,
            data.currentAddressBarangay,
          ),
        },
        { label: "ZIP code", value: data.currentAddressZipCode },
        { label: "Foreign address", value: data.currentForeignAddress },
      ],
    },
  ];
}

function getBachelorGroups(
  flow: BachelorFlow | undefined,
  data: BachelorData | null | undefined,
  {
    optionValue,
    formatAddress,
    formatName,
    formatJoinedOptions,
  }: SheetFormatters,
): ProfileSheetGroup[] {
  if (!flow || !data) return [];

  const groups: ProfileSheetGroup[] = [
    {
      label: "Bachelor application",
      fields: [
        { label: "Term", value: optionValue(data.termOptionId) },
        { label: "Gender", value: optionValue(data.genderOptionId) },
        {
          label: "Civil status",
          value: optionValue(data.civilStatusOptionId),
        },
        {
          label: "Monthly income",
          value: optionValue(data.monthlyIncomeOptionId),
        },
        {
          label: "Student status",
          value: optionValue(data.studentStatusOptionId),
        },
        { label: "Major", value: optionValue(data.majorOptionId) },
        {
          label: "Specialization",
          value: optionValue(data.specializationOptionId),
        },
        {
          label: "Learning hub",
          value: optionValue(data.learningHubOptionId),
        },
        {
          label: "Student type",
          value: optionValue(data.studentTypeOptionId),
        },
        {
          label: "Sub-student type",
          value: optionValue(data.subStudentTypeOptionId),
        },
        { label: "Religion", value: optionValue(data.religionOptionId) },
        { label: "Strand", value: optionValue(data.strandOptionId) },
        {
          label: "Last school attended",
          value: data.lastSchoolAttended,
        },
        { label: "School not found", value: data.schoolNotFound },
        { label: "Other school", value: data.lastSchoolOther },
        {
          label: "Permanent address",
          value: formatAddress(
            data.permanentAddressLine1,
            data.permanentAddressLine2,
            optionValue(data.permanentBarangayOptionId),
            optionValue(data.permanentMunicipalityOptionId),
            optionValue(data.permanentProvinceOptionId),
            data.permanentAddressZipCode,
            optionValue(data.permanentCountryOptionId),
          ),
        },
        {
          label: "Scholarship interest",
          value: optionValue(data.scholarshipInterestOptionId),
        },
        {
          label: "Scholarship",
          value: optionValue(data.scholarshipOptionId),
        },
        {
          label: "Medical condition",
          value: optionValue(data.medicalConditionOptionId),
        },
        {
          label: "Guardian assignment",
          value: optionValue(data.guardianAssignmentOptionId),
        },
        {
          label: "Study reasons",
          value: formatJoinedOptions(data.studyReasons),
        },
        {
          label: "Discovery channels",
          value: formatJoinedOptions(flow.discoveryChannels),
        },
        {
          label: "Referrer name",
          value: formatName(data.referrerGivenName, data.referrerFamilyName),
        },
        { label: "Referrer email", value: data.referrerEmail },
      ],
    },
  ];

  for (const person of data.relatedPeople) {
    groups.push({
      label: `${person.role[0].toUpperCase()}${person.role.slice(1)}`,
      fields: [
        { label: "Role", value: person.role },
        {
          label: "Living status",
          value: optionValue(person.livingStatusOptionId),
        },
        {
          label: "Name",
          value: formatName(
            person.givenName,
            person.middleName,
            person.familyName,
          ),
        },
        { label: "Suffix", value: optionValue(person.suffixOptionId) },
        { label: "Birthdate", value: person.birthdate },
        { label: "Landline", value: person.landline },
        { label: "Mobile", value: person.mobile },
        { label: "Email", value: person.email },
        { label: "Occupation", value: person.occupation },
        {
          label: "Relationship",
          value: optionValue(person.relationshipOptionId),
        },
        { label: "Relationship other", value: person.relationshipOther },
      ],
    });

    for (const address of person.addresses) {
      groups.push({
        label: `${person.role[0].toUpperCase()}${person.role.slice(1)} ${address.addressType} address`,
        fields: [
          { label: "Same as applicant", value: address.sameAsApplicant },
          {
            label: "Address",
            value: formatAddress(
              address.addressLine1,
              address.addressLine2,
              optionValue(address.barangayOptionId),
              optionValue(address.municipalityOptionId),
              optionValue(address.provinceOptionId),
              address.zipCode,
              optionValue(address.countryOptionId),
            ),
          },
        ],
      });
    }
  }

  return groups;
}

function getMicrocredentialGroups(
  flow: MicrocredentialFlow | undefined,
  data: MicrocredentialData | null | undefined,
  { optionValue, formatJoinedOptions }: SheetFormatters,
): ProfileSheetGroup[] {
  if (!flow || !data) return [];

  return [
    {
      label: "Microcredential application",
      fields: [
        {
          label: "Gender",
          value: optionValue(data.genderOptionId),
        },
        {
          label: "Civil status",
          value: optionValue(data.civilStatusOptionId),
        },
        {
          label: "Monthly income",
          value: optionValue(data.monthlyIncomeOptionId),
        },
        {
          label: "Student status",
          value: optionValue(data.studentStatusOptionId),
        },
        {
          label: "Certification",
          value: optionValue(data.certificationOptionId),
        },
        { label: "TIN number", value: data.tinNumber },
        {
          label: "Discovery channels",
          value: formatJoinedOptions(flow.discoveryChannels),
        },
      ],
    },
  ];
}

function getLearnerReadinessGroups(
  data: LearnerReadiness | null | undefined,
  { optionValue }: SheetFormatters,
): ProfileSheetGroup[] {
  if (!data) return [];

  return [
    {
      label: "Learner readiness",
      fields: [
        {
          label: "Assistance need score",
          value: data.assistanceNeedScore,
        },
        {
          label: "Computer/device access",
          value: optionValue(data.deviceAccessOptionId, data.computerDeviceAccess),
        },
        {
          label: "Online learning platforms",
          value: optionValue(
            data.onlinePlatformsOptionId,
            data.onlineLearningPlatforms,
          ),
        },
        {
          label: "Online platforms specified",
          value: data.onlinePlatformsSpecified,
        },
        {
          label: "Software skills",
          value: optionValue(data.softwareSkillsOptionId, data.softwareSkills),
        },
        {
          label: "Internet connectivity",
          value: optionValue(data.internetOptionId, data.internetConnectivity),
        },
        {
          label: "Time commitment",
          value: optionValue(data.timeCommitmentOptionId, data.timeCommitment),
        },
        {
          label: "Time management effectiveness",
          value: optionValue(
            data.timeManagementOptionId,
            data.timeManagementEffectiveness,
          ),
        },
        {
          label: "Self-discipline confidence",
          value: optionValue(
            data.selfDisciplineOptionId,
            data.selfDisciplineConfidence,
          ),
        },
        {
          label: "Learning goal",
          value: optionValue(data.learningGoalOptionId, data.learningGoal),
        },
        {
          label: "Challenges provided",
          value: data.challengesProvided,
        },
        {
          label: "Potential challenges",
          value: data.potentialChallenges,
        },
      ],
    },
  ];
}

function getDocumentGroups(data: Documents | null | undefined): ProfileSheetGroup[] {
  if (!data) return [];

  return [
    {
      label: "Documents",
      fields: [
        {
          label: "Applicant personal ID link",
          value: data.applicantPersonalIdGDriveLink,
        },
        {
          label: "Applicant personal ID submitted",
          value: data.applicantPersonalIdSubmittedDate,
        },
        {
          label: "Applicant personal ID fixture",
          value: data.applicantPersonalIdFixtureUri,
        },
        {
          label: "Applicant personal ID filename",
          value: data.applicantPersonalIdOriginalFilename,
        },
        {
          label: "Applicant personal ID MIME type",
          value: data.applicantPersonalIdMimeType,
        },
        {
          label: "Applicant personal ID size",
          value: data.applicantPersonalIdSizeBytes,
        },
        {
          label: "Proof of HS completion link",
          value: data.proofOfHsCompletionGDriveLink,
        },
        {
          label: "Proof of HS completion submitted",
          value: data.proofOfHsCompletionSubmittedDate,
        },
        {
          label: "Proof of HS completion fixture",
          value: data.proofOfHsCompletionFixtureUri,
        },
        {
          label: "Proof of HS completion filename",
          value: data.proofOfHsCompletionOriginalFilename,
        },
        {
          label: "Proof of HS completion MIME type",
          value: data.proofOfHsCompletionMimeType,
        },
        {
          label: "Proof of HS completion size",
          value: data.proofOfHsCompletionSizeBytes,
        },
      ],
    },
  ];
}

function getPaymentDetailsGroups(
  data: PaymentDetails | null | undefined,
): ProfileSheetGroup[] {
  if (!data) return [];

  return [
    {
      label: "Payment details",
      fields: [
        { label: "Program fee", value: data.programFee },
        {
          label: "Needs official receipt",
          value: data.needOfficialReceipt,
        },
        { label: "Promo code", value: data.promoCode },
        { label: "TIN number", value: data.tinNumber },
        { label: "Discounted fee", value: data.discountedFee },
        { label: "Business name", value: data.businessName },
        { label: "Payment method", value: data.paymentMethod },
        {
          label: "Business TIN number",
          value: data.businessTinNumber,
        },
        {
          label: "Proof of payment",
          value: data.proofOfPayment,
        },
        {
          label: "Business address",
          value: data.businessAddress,
        },
        {
          label: "Renewal payment",
          value: data.isRenewalPayment,
        },
        {
          label: "Business BIR 2303 link",
          value: data.businessBir2303GDriveLink,
        },
        {
          label: "Proof of payment link",
          value: data.proofOfPaymentGDriveLink,
        },
        {
          label: "Business BIR 2303 submitted",
          value: data.businessBir2303SubmittedDate,
        },
        {
          label: "Proof of payment submitted",
          value: data.proofOfPaymentSubmittedDate,
        },
        {
          label: "Proof of payment AA remarks",
          value: data.proofOfPaymentAaRemarks,
        },
        {
          label: "Payment verification timestamp",
          value: data.timestampInPaymentVerification,
        },
      ],
    },
  ];
}

function getStudyBuddyGroups(
  data: StudyBuddy | null | undefined,
): ProfileSheetGroup[] {
  if (!data) return [];

  return [
    {
      label: "Study buddy",
      fields: [
        { label: "Nominator", value: data.sbNominator },
        { label: "Nominee name", value: data.sbNomineeName },
        { label: "Promo code", value: data.sbPromoCode },
        { label: "Nominee email", value: data.sbNomineeEmail },
      ],
    },
  ];
}

function getAdditionalInfoGroups(
  data: AdditionalInfo | null | undefined,
): ProfileSheetGroup[] {
  if (!data) return [];

  return [
    {
      label: "Additional info",
      fields: [
        {
          label: "How did you find out",
          value: data.howDidYouFindOut,
        },
        {
          label: "Coursera invite sent",
          value: data.courseraInviteSent,
        },
        {
          label: "Has application form edits",
          value: data.hasAppFormEdits,
        },
        {
          label: "Coursera invite sent date",
          value: data.courseraInviteSentDate,
        },
      ],
    },
  ];
}

function getDisclosureGroups(
  data: Disclosures | null | undefined,
): ProfileSheetGroup[] {
  if (!data) return [];

  return [
    {
      label: "Disclosures",
      fields: [
        { label: "Data privacy 1", value: data.dataPrivacy1 },
        {
          label: "Marketing notification consent",
          value: data.marketingNotifConsent,
        },
        { label: "Data privacy 2", value: data.dataPrivacy2 },
      ],
    },
  ];
}

function getSystemInfoGroups(
  data: SystemInfo | null | undefined,
): ProfileSheetGroup[] {
  if (!data) return [];

  return [
    {
      label: "System info",
      fields: [
        { label: "Sent to API", value: data.isSentToApi },
        { label: "Last sent to API", value: data.lastSentToApi },
        { label: "API error", value: data.isApiError },
        { label: "API error message", value: data.apiErrorMessage },
        {
          label: "Change record type",
          value: data.changeRecordType,
        },
      ],
    },
  ];
}

export function getProfileSheetGroups(
  profile: ProfileSheetSource,
): ProfileSheetGroup[] {
  const formatters = createSheetFormatters(profile);
  const bachelorFlow = profile.flows.find(
    (flow) => flow.flowType === "bachelors",
  );
  const bachelorData = bachelorFlow?.bachelorData;
  const microcredentialFlow = profile.flows.find(
    (flow) => flow.flowType === "microcredentials",
  );
  const microcredentialData = microcredentialFlow?.microcredentialData;
  const learnerReadiness =
    profile.learnerReadiness ?? microcredentialData?.learnerReadiness;
  const documents = profile.documents ?? bachelorData?.documents;

  return [
    ...getBaseProfileGroups(profile, formatters),
    ...getBachelorGroups(bachelorFlow, bachelorData, formatters),
    ...getMicrocredentialGroups(
      microcredentialFlow,
      microcredentialData,
      formatters,
    ),
    ...getLearnerReadinessGroups(learnerReadiness, formatters),
    ...getDocumentGroups(documents),
    ...getPaymentDetailsGroups(profile.paymentDetails),
    ...getStudyBuddyGroups(profile.studyBuddy),
    ...getAdditionalInfoGroups(profile.additionalInfo),
    ...getDisclosureGroups(profile.disclosures),
    ...getSystemInfoGroups(profile.systemInfo),
  ];
}
