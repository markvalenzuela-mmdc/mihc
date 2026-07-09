import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { ENROLLMATE_OPTION_SET_KEYS } from "../schema/enrollmate-catalog";
import {
  profileAdditionalInfo,
  profileBachelorData,
  profileDiscoveryChannels,
  profileDisclosures,
  profileDocuments,
  profileEnrollmentData,
  profileFlows,
  profileLearnerReadiness,
  profileMicrocredentialData,
  profilePaymentDetails,
  profileRelatedPeople,
  profileRelatedPersonAddresses,
  profiles,
  profileStudyBuddy,
  profileStudyReasons,
  profileSystemInfo,
} from "../schema";
import type * as schema from "../schema";
import { getSeedUuid } from "./helpers";

const ariEnrollment = {
  givenName: "Ari",
  familyName: "Santos",
  middleName: null,
  suffix: null,
  birthplace: "Antipolo City",
  birthdate: "2007-03-14",
  nationality: "Filipino",
  mobile: "+63 917 555 0142",
  landline: null,
  currentAddressCountry: "Philippines",
  currentAddressLine1: "1421 J. P. Rizal Avenue",
  currentAddressLine2: null,
  currentAddressProvince: "Rizal",
  currentAddressCity: "Antipolo City",
  currentAddressBarangay: "Mayamot",
  currentAddressZipCode: "1870",
  currentForeignAddress: null,
};

const ariApplication = {
  gender: "Female",
  civilStatus: "Single",
  monthlyIncome: "25,000 - 49,999",
  preferredLearningHub: "Mapua University Makati",
  studentType: "Freshman",
  subStudentType: "Recent Grade 12 graduate",
  studentStatus: "Full-Time Student",
  religion: "Roman Catholic, including Catholic Charismatic",
  strand: "Science, Technology, Engineering and Mathematics (STEM)",
  lastSchoolAttended: "Makati Science High School",
  termApplied: "August 2026 | First Term",
  programFocus: "BS Information Technology",
  programApplied: "BS IT Software Development Specialization",
  certificationField: "AI, Tech, and Data",
  permanentAddressCountry: "Philippines",
  permanentAddressLine1: "1421 J. P. Rizal Avenue",
  permanentAddressLine2: null,
  permanentAddressProvince: "Rizal",
  permanentAddressCity: "Antipolo City",
  permanentAddressBarangay: "Mayamot",
  permanentAddressZipCode: "1870",
  interestedInScholarship: "Yes",
  withMedicalCondition: "No",
  fatherStatus: "Living",
  motherStatus: "Living",
  guardianType: "Mother",
  guardianGivenName: "Liza",
  guardianFamilyName: "Santos",
  guardianBirthdate: "1982-08-06",
  guardianMobile: "+63 917 555 0188",
  guardianEmail: "liza.santos@example.com",
  guardianOccupation: "Accountant",
};

const emptyLearnerReadiness = {
  assistanceNeedScore: null,
  computerDeviceAccess: null,
  onlineLearningPlatforms: null,
  softwareSkills: null,
  onlinePlatformsSpecified: null,
  internetConnectivity: null,
  timeCommitment: null,
  timeManagementEffectiveness: null,
  selfDisciplineConfidence: null,
  learningGoal: null,
  challengesProvided: null,
  potentialChallenges: null,
};

function createDocumentsFixture(slug: string, submittedDate: string) {
  return {
    applicantPersonalIdGDriveLink: `https://drive.google.com/file/d/${slug}-personal-id/view`,
    proofOfHsCompletionGDriveLink: `https://drive.google.com/file/d/${slug}-hs-completion/view`,
    applicantPersonalIdSubmittedDate: submittedDate,
    proofOfHsCompletionSubmittedDate: submittedDate,
    applicantPersonalIdFixtureUri: `fixtures/e2e/documents/${slug}-personal-id.pdf`,
    applicantPersonalIdOriginalFilename: `${slug}-personal-id.pdf`,
    applicantPersonalIdMimeType: "application/pdf",
    applicantPersonalIdSizeBytes: 428_160,
    proofOfHsCompletionFixtureUri: `fixtures/e2e/documents/${slug}-form-138.pdf`,
    proofOfHsCompletionOriginalFilename: `${slug}-form-138.pdf`,
    proofOfHsCompletionMimeType: "application/pdf",
    proofOfHsCompletionSizeBytes: 812_544,
  };
}

function createPaymentDetailsFixture({
  slug,
  paidDate,
  paymentMethod,
  promoCode,
  tinNumber,
  businessName,
  businessTinNumber,
  businessAddress,
  timestampInPaymentVerification,
}: {
  slug: string;
  paidDate: string;
  paymentMethod: string;
  promoCode: string;
  tinNumber: string;
  businessName: string;
  businessTinNumber: string;
  businessAddress: string;
  timestampInPaymentVerification: string;
}) {
  return {
    programFee: "₱18,000.00",
    needOfficialReceipt: true,
    promoCode,
    tinNumber,
    discountedFee: "₱15,300.00",
    businessName,
    paymentMethod,
    businessTinNumber,
    proofOfPayment: `Bank transfer reference ${slug.toUpperCase()}-${paidDate.replaceAll("-", "")}`,
    businessAddress,
    isRenewalPayment: false,
    businessBir2303GDriveLink: `https://drive.google.com/file/d/${slug}-bir-2303/view`,
    proofOfPaymentGDriveLink: `https://drive.google.com/file/d/${slug}-proof-of-payment/view`,
    businessBir2303SubmittedDate: paidDate,
    proofOfPaymentSubmittedDate: paidDate,
    proofOfPaymentAaRemarks: "Payment verified against uploaded receipt.",
    timestampInPaymentVerification,
  };
}

function createStudyBuddyFixture(slug: string, nomineeName: string) {
  return {
    sbNominator: "Applicant",
    sbNomineeName: nomineeName,
    sbPromoCode: `SB-${slug.toUpperCase()}`,
    sbNomineeEmail: `${slug}.studybuddy@example.edu`,
  };
}

function createAdditionalInfoFixture(
  howDidYouFindOut: string,
  courseraInviteSentDate: string,
) {
  return {
    howDidYouFindOut,
    courseraInviteSent: true,
    hasAppFormEdits: true,
    courseraInviteSentDate,
  };
}

const submittedDisclosures = {
  dataPrivacy1: true,
  marketingNotifConsent: true,
  dataPrivacy2: true,
};

function createSystemInfoFixture(lastSentToApi: string) {
  return {
    isSentToApi: true,
    lastSentToApi,
    isApiError: false,
    apiErrorMessage: "No API errors returned.",
    changeRecordType: "Initial enrollment sync",
  };
}

const profileFixtures = [
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40101",
    name: "Ari Santos",
    middleName: null,
    email: "ari.santos@example.edu",
    program: "BS Information Technology",
    cohort: "2026-A",
    status: "validated",
    enrollmentData: ariEnrollment,
    applicationData: ariApplication,
    learnerReadiness: emptyLearnerReadiness,
    paymentDetails: createPaymentDetailsFixture({
      slug: "ari-santos",
      paidDate: "2026-06-20",
      paymentMethod: "Bank transfer",
      promoCode: "WELCOME2026",
      tinNumber: "123-456-789-000",
      businessName: "Santos Family Learning Fund",
      businessTinNumber: "987-654-321-000",
      businessAddress: "1421 J. P. Rizal Avenue, Antipolo City, Rizal 1870",
      timestampInPaymentVerification: "2026-06-20T09:45:00.000Z",
    }),
    studyBuddy: createStudyBuddyFixture("ari-santos", "Bea Mendoza"),
    documents: createDocumentsFixture("ari-santos", "2026-06-18"),
    additionalInfo: createAdditionalInfoFixture(
      "Facebook admissions campaign",
      "2026-06-21",
    ),
    disclosures: submittedDisclosures,
    systemInfo: createSystemInfoFixture("2026-06-21T02:30:00.000Z"),
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40102",
    name: "Mika Reyes",
    middleName: null,
    email: "mika.reyes@example.edu",
    program: "BS Business Administration",
    cohort: "2026-A",
    status: "new",
    enrollmentData: {
      ...ariEnrollment,
      givenName: "Mika",
      familyName: "Reyes",
    },
    applicationData: {
      ...ariApplication,
      programApplied: "BS BA Marketing Management Specialization",
      programFocus: "BS Business Administration",
      strand: "Accountancy, Business and Management (ABM)",
      guardianGivenName: "Paolo",
      guardianFamilyName: "Reyes",
    },
    learnerReadiness: emptyLearnerReadiness,
    paymentDetails: createPaymentDetailsFixture({
      slug: "mika-reyes",
      paidDate: "2026-06-22",
      paymentMethod: "GCash",
      promoCode: "ABM2026",
      tinNumber: "234-567-890-000",
      businessName: "Reyes Family Store",
      businessTinNumber: "876-543-210-000",
      businessAddress: "88 Katipunan Avenue, Quezon City 1108",
      timestampInPaymentVerification: "2026-06-22T07:15:00.000Z",
    }),
    studyBuddy: createStudyBuddyFixture("mika-reyes", "Iya Dela Cruz"),
    documents: createDocumentsFixture("mika-reyes", "2026-06-19"),
    additionalInfo: createAdditionalInfoFixture(
      "Referred by Friends",
      "2026-06-23",
    ),
    disclosures: submittedDisclosures,
    systemInfo: createSystemInfoFixture("2026-06-23T03:10:00.000Z"),
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40103",
    name: "Noel Cruz",
    middleName: null,
    email: "noel.cruz@example.edu",
    program: "BS Information Technology",
    cohort: "2026-A",
    status: "guidance_needed",
    enrollmentData: {
      ...ariEnrollment,
      givenName: "Noel",
      familyName: "Cruz",
      mobile: null,
      currentAddressBarangay: null,
    },
    applicationData: {
      ...ariApplication,
      programApplied: "BS IT Network & Cybersecurity Specialization",
      guardianEmail: null,
      interestedInScholarship: null,
    },
    learnerReadiness: emptyLearnerReadiness,
    paymentDetails: createPaymentDetailsFixture({
      slug: "noel-cruz",
      paidDate: "2026-06-24",
      paymentMethod: "Maya",
      promoCode: "CYBER2026",
      tinNumber: "345-678-901-000",
      businessName: "Cruz Cyber Services",
      businessTinNumber: "765-432-109-000",
      businessAddress: "25 Aurora Boulevard, San Juan City 1500",
      timestampInPaymentVerification: "2026-06-24T08:20:00.000Z",
    }),
    studyBuddy: createStudyBuddyFixture("noel-cruz", "Marco Tan"),
    documents: createDocumentsFixture("noel-cruz", "2026-06-20"),
    additionalInfo: createAdditionalInfoFixture(
      "Guidance counselor referral",
      "2026-06-25",
    ),
    disclosures: submittedDisclosures,
    systemInfo: createSystemInfoFixture("2026-06-25T04:05:00.000Z"),
  },
  {
    id: "3591b2d2-886b-45c6-bcbd-3c8756b40104",
    name: "Sam Lim",
    middleName: null,
    email: "sam.lim@example.edu",
    program: "BS Business Administration",
    cohort: "2026-A",
    status: "completed",
    enrollmentData: {
      ...ariEnrollment,
      givenName: "Sam",
      familyName: "Lim",
    },
    applicationData: {
      ...ariApplication,
      programApplied: "BS BA Operations Management Specialization",
      programFocus: "BS Business Administration",
      strand: "Humanities and Social Sciences (HUMSS)",
    },
    learnerReadiness: emptyLearnerReadiness,
    paymentDetails: createPaymentDetailsFixture({
      slug: "sam-lim",
      paidDate: "2026-06-26",
      paymentMethod: "Credit card",
      promoCode: "OPS2026",
      tinNumber: "456-789-012-000",
      businessName: "Lim Trading Co.",
      businessTinNumber: "654-321-098-000",
      businessAddress: "9 Salcedo Street, Makati City 1227",
      timestampInPaymentVerification: "2026-06-26T06:55:00.000Z",
    }),
    studyBuddy: createStudyBuddyFixture("sam-lim", "Nico Villanueva"),
    documents: createDocumentsFixture("sam-lim", "2026-06-21"),
    additionalInfo: createAdditionalInfoFixture(
      "School fair booth",
      "2026-06-27",
    ),
    disclosures: submittedDisclosures,
    systemInfo: createSystemInfoFixture("2026-06-27T01:40:00.000Z"),
  },
];

export async function seedProfiles(
  tx: NodePgDatabase<typeof schema>,
  catalogVersionId: string,
  optionId: (setKey: string, submittedValue: string | null) => string | null,
) {
  const messages: string[] = [];

  for (const profile of profileFixtures) {
    const enrollment = profile.enrollmentData;
    const application = profile.applicationData;
    const profileValues = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      program: profile.program,
      cohort: profile.cohort,
      catalogVersionId,
      status: profile.status as (typeof profiles.$inferSelect)["status"],
      createdBy: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3",
      updatedBy: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3",
    };

    await tx.insert(profiles).values(profileValues).onConflictDoUpdate({
      target: profiles.id,
      set: profileValues,
    });

    const enrollmentValues = {
      id: getSeedUuid(`profile-enrollment:${profile.id}`),
      profileId: profile.id,
      catalogVersionId,
      suffixOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.suffix,
        enrollment.suffix,
      ),
      nationalityOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.nationality,
        enrollment.nationality,
      ),
      currentCountryOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.country,
        enrollment.currentAddressCountry,
      ),
      currentProvinceOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.province,
        enrollment.currentAddressProvince,
      ),
      currentMunicipalityOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.municipality,
        enrollment.currentAddressCity,
      ),
      currentBarangayOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.barangay,
        enrollment.currentAddressBarangay,
      ),
      ...enrollment,
    };

    await tx
      .insert(profileEnrollmentData)
      .values(enrollmentValues)
      .onConflictDoUpdate({
        target: profileEnrollmentData.profileId,
        set: enrollmentValues,
      });

    const bachelorFlowId = getSeedUuid(`profile-flow:${profile.id}:bachelors`);
    await tx
      .insert(profileFlows)
      .values({
        id: bachelorFlowId,
        profileId: profile.id,
        catalogVersionId,
        flowType: "bachelors",
      })
      .onConflictDoUpdate({
        target: profileFlows.id,
        set: { catalogVersionId },
      });

    const bachelorDataId = getSeedUuid(`profile-bachelor-data:${profile.id}`);
    const bachelorValues = {
      id: bachelorDataId,
      profileFlowId: bachelorFlowId,
      catalogVersionId,
      termOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorTerm,
        application.termApplied,
      ),
      genderOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorGender,
        application.gender,
      ),
      civilStatusOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorCivilStatus,
        application.civilStatus,
      ),
      monthlyIncomeOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorMonthlyIncome,
        application.monthlyIncome,
      ),
      studentStatusOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorStudentStatus,
        application.studentStatus,
      ),
      majorOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorMajor,
        application.programFocus,
      ),
      specializationOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorSpecialization,
        application.programApplied,
      ),
      learningHubOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorLearningHub,
        application.preferredLearningHub,
      ),
      studentTypeOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorStudentType,
        application.studentType,
      ),
      subStudentTypeOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorSubStudentType,
        application.subStudentType,
      ),
      religionOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.religion,
        application.religion,
      ),
      strandOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorStrand,
        application.strand,
      ),
      lastSchoolAttended: application.lastSchoolAttended,
      permanentAddressLine1: application.permanentAddressLine1,
      permanentAddressLine2: application.permanentAddressLine2,
      permanentAddressZipCode: application.permanentAddressZipCode,
      permanentCountryOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.country,
        application.permanentAddressCountry,
      ),
      permanentProvinceOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.province,
        application.permanentAddressProvince,
      ),
      permanentMunicipalityOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.municipality,
        application.permanentAddressCity,
      ),
      permanentBarangayOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.barangay,
        application.permanentAddressBarangay,
      ),
      scholarshipInterestOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorScholarshipInterest,
        application.interestedInScholarship,
      ),
      medicalConditionOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorMedicalCondition,
        application.withMedicalCondition,
      ),
      guardianAssignmentOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorGuardianAssignment,
        application.guardianType,
      ),
    };

    await tx
      .insert(profileBachelorData)
      .values(bachelorValues)
      .onConflictDoUpdate({
        target: profileBachelorData.id,
        set: bachelorValues,
      });

    for (const channel of ["Facebook", "Referred by Friends"]) {
      await tx
        .insert(profileDiscoveryChannels)
        .values({
          profileFlowId: bachelorFlowId,
          catalogVersionId,
          optionId: optionId(
            ENROLLMATE_OPTION_SET_KEYS.discoveryChannels,
            channel,
          )!,
        })
        .onConflictDoNothing();
    }

    await tx
      .insert(profileStudyReasons)
      .values({
        bachelorDataId,
        catalogVersionId,
        optionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.bachelorStudyReasons,
          "Quality of education",
        )!,
      })
      .onConflictDoNothing();

    const relatedPeople = [
      {
        role: "father" as const,
        livingStatusOptionSetKey:
          ENROLLMATE_OPTION_SET_KEYS.bachelorFatherLivingStatus,
        livingStatusOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.bachelorFatherLivingStatus,
          application.fatherStatus,
        ),
        givenName: "Ramon",
        familyName: enrollment.familyName,
        email: "ramon.parent@example.com",
        occupation: "Engineer",
      },
      {
        role: "mother" as const,
        livingStatusOptionSetKey:
          ENROLLMATE_OPTION_SET_KEYS.bachelorMotherLivingStatus,
        livingStatusOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.bachelorMotherLivingStatus,
          application.motherStatus,
        ),
        givenName: "Liza",
        familyName: enrollment.familyName,
        email: "liza.parent@example.com",
        occupation: "Accountant",
      },
      {
        role: "guardian" as const,
        livingStatusOptionSetKey: null,
        livingStatusOptionId: null,
        givenName: application.guardianGivenName,
        familyName: application.guardianFamilyName,
        email: application.guardianEmail,
        occupation: application.guardianOccupation,
      },
    ];

    for (const person of relatedPeople) {
      const relatedPersonId = getSeedUuid(
        `profile-related-person:${profile.id}:${person.role}`,
      );
      const relationshipOptionSetKey =
        person.role === "guardian"
          ? ENROLLMATE_OPTION_SET_KEYS.bachelorGuardianRelationship
          : null;
      const relationshipOptionId =
        person.role === "guardian"
          ? optionId(
              ENROLLMATE_OPTION_SET_KEYS.bachelorGuardianRelationship,
              "Others",
            )
          : null;

      await tx
        .insert(profileRelatedPeople)
        .values({
          id: relatedPersonId,
          bachelorDataId,
          catalogVersionId,
          role: person.role,
          livingStatusOptionSetKey: person.livingStatusOptionSetKey,
          livingStatusOptionId: person.livingStatusOptionId,
          givenName: person.givenName,
          familyName: person.familyName,
          birthdate: application.guardianBirthdate,
          mobile: application.guardianMobile,
          email: person.email,
          occupation: person.occupation,
          relationshipOptionSetKey,
          relationshipOptionId,
          relationshipOther:
            person.role === "guardian" ? "Parent representative" : null,
        })
        .onConflictDoUpdate({
          target: profileRelatedPeople.id,
          set: {
            livingStatusOptionSetKey: person.livingStatusOptionSetKey,
            livingStatusOptionId: person.livingStatusOptionId,
            givenName: person.givenName,
            familyName: person.familyName,
            email: person.email,
            occupation: person.occupation,
            relationshipOptionSetKey,
            relationshipOptionId,
          },
        });

      for (const addressType of ["current", "permanent"] as const) {
        const isCurrent = addressType === "current";
        const addressValues = {
          id: getSeedUuid(
            `profile-related-address:${profile.id}:${person.role}:${addressType}`,
          ),
          relatedPersonId,
          catalogVersionId,
          addressType,
          sameAsApplicant: true,
          countryOptionId: optionId(
            ENROLLMATE_OPTION_SET_KEYS.country,
            isCurrent
              ? enrollment.currentAddressCountry
              : application.permanentAddressCountry,
          ),
          addressLine1: isCurrent
            ? enrollment.currentAddressLine1
            : application.permanentAddressLine1,
          addressLine2: isCurrent
            ? enrollment.currentAddressLine2
            : application.permanentAddressLine2,
          provinceOptionId: optionId(
            ENROLLMATE_OPTION_SET_KEYS.province,
            isCurrent
              ? enrollment.currentAddressProvince
              : application.permanentAddressProvince,
          ),
          municipalityOptionId: optionId(
            ENROLLMATE_OPTION_SET_KEYS.municipality,
            isCurrent
              ? enrollment.currentAddressCity
              : application.permanentAddressCity,
          ),
          barangayOptionId: optionId(
            ENROLLMATE_OPTION_SET_KEYS.barangay,
            isCurrent
              ? enrollment.currentAddressBarangay
              : application.permanentAddressBarangay,
          ),
          zipCode: isCurrent
            ? enrollment.currentAddressZipCode
            : application.permanentAddressZipCode,
        };

        await tx
          .insert(profileRelatedPersonAddresses)
          .values(addressValues)
          .onConflictDoUpdate({
            target: profileRelatedPersonAddresses.id,
            set: addressValues,
          });
      }
    }

    let microcredentialDataId: string | null = null;
    if (profile === profileFixtures[0]) {
      const microcredentialFlowId = getSeedUuid(
        `profile-flow:${profile.id}:microcredentials`,
      );
      await tx
        .insert(profileFlows)
        .values({
          id: microcredentialFlowId,
          profileId: profile.id,
          catalogVersionId,
          flowType: "microcredentials",
        })
        .onConflictDoUpdate({
          target: profileFlows.id,
          set: { catalogVersionId },
        });

      microcredentialDataId = getSeedUuid(
        `profile-microcredential-data:${profile.id}`,
      );
      const microcredentialValues = {
        id: microcredentialDataId,
        profileFlowId: microcredentialFlowId,
        catalogVersionId,
        genderOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialGender,
          application.gender,
        ),
        civilStatusOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialCivilStatus,
          application.civilStatus,
        ),
        monthlyIncomeOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialMonthlyIncome,
          application.monthlyIncome,
        ),
        studentStatusOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialStudentStatus,
          application.studentStatus,
        ),
        certificationOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialCertification,
          application.certificationField,
        ),
      };
      await tx
        .insert(profileMicrocredentialData)
        .values(microcredentialValues)
        .onConflictDoUpdate({
          target: profileMicrocredentialData.id,
          set: microcredentialValues,
        });

      await tx
        .insert(profileDiscoveryChannels)
        .values({
          profileFlowId: microcredentialFlowId,
          catalogVersionId,
          optionId: optionId(
            ENROLLMATE_OPTION_SET_KEYS.discoveryChannels,
            "Instagram",
          )!,
        })
        .onConflictDoNothing();
    }

    if (microcredentialDataId && profile.learnerReadiness) {
      const learnerReadinessValues = {
        id: getSeedUuid(`profile-learner-readiness:${profile.id}`),
        profileId: profile.id,
        microcredentialDataId,
        catalogVersionId,
        deviceAccessOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialDeviceAccess,
          "Yes",
        ),
        internetOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialInternet,
          "Yes",
        ),
        softwareSkillsOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialSoftwareSkills,
          "Yes",
        ),
        onlinePlatformsOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialOnlinePlatforms,
          "Yes",
        ),
        timeCommitmentOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialTimeCommitment,
          "2-4 hrs",
        ),
        selfDisciplineOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialSelfDiscipline,
          "Very confident",
        ),
        timeManagementOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialTimeManagement,
          "Very effective",
        ),
        learningGoalOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialLearningGoals,
          "Personal Enrichment: Expanding knowledge for personal growth and learning",
        ),
        potentialChallenges: profile.learnerReadiness.potentialChallenges,
      };

      await tx
        .insert(profileLearnerReadiness)
        .values(learnerReadinessValues)
        .onConflictDoUpdate({
          target: profileLearnerReadiness.profileId,
          set: learnerReadinessValues,
        });
    }

    if (profile.documents) {
      const documentValues = {
        id: getSeedUuid(`profile-documents:${profile.id}`),
        profileId: profile.id,
        bachelorDataId,
        ...profile.documents,
      };

      await tx
        .insert(profileDocuments)
        .values(documentValues)
        .onConflictDoUpdate({
          target: profileDocuments.profileId,
          set: documentValues,
        });
    }

    if (profile.paymentDetails) {
      const paymentDetailsValues = {
        id: getSeedUuid(`profile-payment-details:${profile.id}`),
        profileId: profile.id,
        ...profile.paymentDetails,
        timestampInPaymentVerification: profile.paymentDetails
          .timestampInPaymentVerification
          ? new Date(profile.paymentDetails.timestampInPaymentVerification)
          : null,
      };

      await tx
        .insert(profilePaymentDetails)
        .values(paymentDetailsValues)
        .onConflictDoUpdate({
          target: profilePaymentDetails.profileId,
          set: paymentDetailsValues,
        });
    }

    if (profile.studyBuddy) {
      const studyBuddyValues = {
        id: getSeedUuid(`profile-study-buddy:${profile.id}`),
        profileId: profile.id,
        ...profile.studyBuddy,
      };

      await tx
        .insert(profileStudyBuddy)
        .values(studyBuddyValues)
        .onConflictDoUpdate({
          target: profileStudyBuddy.profileId,
          set: studyBuddyValues,
        });
    }

    if (profile.additionalInfo) {
      const additionalInfoValues = {
        id: getSeedUuid(`profile-additional-info:${profile.id}`),
        profileId: profile.id,
        ...profile.additionalInfo,
      };

      await tx
        .insert(profileAdditionalInfo)
        .values(additionalInfoValues)
        .onConflictDoUpdate({
          target: profileAdditionalInfo.profileId,
          set: additionalInfoValues,
        });
    }

    if (profile.disclosures) {
      const disclosureValues = {
        id: getSeedUuid(`profile-disclosures:${profile.id}`),
        profileId: profile.id,
        ...profile.disclosures,
      };

      await tx
        .insert(profileDisclosures)
        .values(disclosureValues)
        .onConflictDoUpdate({
          target: profileDisclosures.profileId,
          set: disclosureValues,
        });
    }

    if (profile.systemInfo) {
      const systemInfoValues = {
        id: getSeedUuid(`profile-system-info:${profile.id}`),
        profileId: profile.id,
        ...profile.systemInfo,
        lastSentToApi: profile.systemInfo.lastSentToApi
          ? new Date(profile.systemInfo.lastSentToApi)
          : null,
      };

      await tx
        .insert(profileSystemInfo)
        .values(systemInfoValues)
        .onConflictDoUpdate({
          target: profileSystemInfo.profileId,
          set: systemInfoValues,
        });
    }

    messages.push(`Seeded profile: ${profile.email}`);
  }

  return messages;
}

export { profileFixtures as profiles };
