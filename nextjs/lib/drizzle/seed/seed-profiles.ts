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
  givenName: "Ari", familyName: "Santos", middleName: null, suffix: null, birthplace: "Antipolo City", birthdate: "2007-03-14", gender: "Female", nationality: "Filipino", civilStatus: "Single", monthlyIncome: "25,000 - 49,999", mobile: "+63 917 555 0142", landline: null, workType: null, companyOrgName: null, preferredLearningHub: "Mapua University Makati", studentType: "Freshman", subStudentType: "Recent Grade 12 graduate", studentStatus: "Full-Time Student", religion: "Roman Catholic, including Catholic Charismatic", strand: "Science, Technology, Engineering and Mathematics (STEM)", lastSchoolAttended: "Makati Science High School", termApplied: "August 2026 | First Term", programFocus: "BS Information Technology", programApplied: "BS IT Software Development Specialization", certificationField: "AI, Tech, and Data", isLeapPadReEnrollment: false, isSelfEnrolled: false, currentAddressCountry: "Philippines", currentAddressLine1: "1421 J. P. Rizal Avenue", currentAddressLine2: null, currentAddressProvince: "Rizal", currentAddressCity: "Antipolo City", currentAddressBarangay: "Mayamot", currentAddressZipCode: "1870", currentForeignAddress: null, permanentAddressCountry: "Philippines", permanentAddressLine1: "1421 J. P. Rizal Avenue", permanentAddressLine2: null, permanentAddressProvince: "Rizal", permanentAddressCity: "Antipolo City", permanentAddressBarangay: "Mayamot", permanentAddressZipCode: "1870", interestedInScholarship: "Yes", withMedicalCondition: "No", lostDate: null, lostReason: null, lostReasonSpecific: null, lostReasonRemark: null, profileLockedDate: null, subscriptionExpirationDate: null, fatherStatus: "Living", motherStatus: "Living", guardianType: "Mother", guardianGivenName: "Liza", guardianFamilyName: "Santos", guardianSuffix: null, guardianBirthdate: "1982-08-06", guardianMobile: "+63 917 555 0188", guardianEmail: "liza.santos@example.com", guardianOccupation: "Accountant", guardianRelationship: "Mother", copyGuardianAddress: true, copyPermanentGuardianAddress: true,
};

const emptyLearnerReadiness = {
  assistanceNeedScore: null, computerDeviceAccess: null, onlineLearningPlatforms: null, softwareSkills: null, onlinePlatformsSpecified: null, internetConnectivity: null, timeCommitment: null, timeManagementEffectiveness: null, selfDisciplineConfidence: null, learningGoal: null, challengesProvided: null, potentialChallenges: null,
};

const emptyPaymentDetails = {
  programFee: null, needOfficialReceipt: false, promoCode: null, tinNumber: null, discountedFee: null, businessName: null, paymentMethod: null, businessTinNumber: null, proofOfPayment: null, businessAddress: null, isRenewalPayment: false, businessBir2303GDriveLink: null, proofOfPaymentGDriveLink: null, businessBir2303SubmittedDate: null, proofOfPaymentSubmittedDate: null, proofOfPaymentAaRemarks: null, timestampInPaymentVerification: null,
};

const emptyStudyBuddy = {
  sbNominator: null, sbNomineeName: null, sbPromoCode: null, sbNomineeEmail: null,
};

const emptyDocuments = {
  applicantPersonalIdGDriveLink: null, proofOfHsCompletionGDriveLink: null, applicantPersonalIdSubmittedDate: null, proofOfHsCompletionSubmittedDate: null,
};

const emptyAdditionalInfo = {
  howDidYouFindOut: null, courseraInviteSent: false, hasAppFormEdits: false, courseraInviteSentDate: null,
};

const emptyDisclosures = {
  dataPrivacy1: false, marketingNotifConsent: false, dataPrivacy2: false,
};

const emptySystemInfo = {
  isSentToApi: false, lastSentToApi: null, isApiError: false, apiErrorMessage: null, changeRecordType: null,
};

const profileFixtures = [
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40101", name: "Ari Santos", middleName: null, email: "ari.santos@example.edu", program: "BS Information Technology", cohort: "2026-A", status: "validated", enrollmentData: ariEnrollment, learnerReadiness: emptyLearnerReadiness, paymentDetails: emptyPaymentDetails, studyBuddy: emptyStudyBuddy, documents: emptyDocuments, additionalInfo: emptyAdditionalInfo, disclosures: emptyDisclosures, systemInfo: emptySystemInfo },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40102", name: "Mika Reyes", middleName: null, email: "mika.reyes@example.edu", program: "BS Business Administration", cohort: "2026-A", status: "new", enrollmentData: { ...ariEnrollment, givenName: "Mika", familyName: "Reyes", programApplied: "BS BA Marketing Management Specialization", programFocus: "BS Business Administration", strand: "Accountancy, Business and Management (ABM)", guardianGivenName: "Paolo", guardianFamilyName: "Reyes" }, learnerReadiness: emptyLearnerReadiness, paymentDetails: emptyPaymentDetails, studyBuddy: emptyStudyBuddy, documents: emptyDocuments, additionalInfo: emptyAdditionalInfo, disclosures: emptyDisclosures, systemInfo: emptySystemInfo },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40103", name: "Noel Cruz", middleName: null, email: "noel.cruz@example.edu", program: "BS Information Technology", cohort: "2026-A", status: "guidance_needed", enrollmentData: { ...ariEnrollment, givenName: "Noel", familyName: "Cruz", programApplied: "BS IT Network & Cybersecurity Specialization", mobile: null, currentAddressBarangay: null, guardianEmail: null, interestedInScholarship: null }, learnerReadiness: emptyLearnerReadiness, paymentDetails: emptyPaymentDetails, studyBuddy: emptyStudyBuddy, documents: emptyDocuments, additionalInfo: emptyAdditionalInfo, disclosures: emptyDisclosures, systemInfo: emptySystemInfo },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40104", name: "Sam Lim", middleName: null, email: "sam.lim@example.edu", program: "BS Business Administration", cohort: "2026-A", status: "completed", enrollmentData: { ...ariEnrollment, givenName: "Sam", familyName: "Lim", programApplied: "BS BA Operations Management Specialization", programFocus: "BS Business Administration", strand: "Humanities and Social Sciences (HUMSS)" }, learnerReadiness: emptyLearnerReadiness, paymentDetails: emptyPaymentDetails, studyBuddy: emptyStudyBuddy, documents: emptyDocuments, additionalInfo: emptyAdditionalInfo, disclosures: emptyDisclosures, systemInfo: emptySystemInfo },
];

export async function seedProfiles(
  tx: NodePgDatabase<typeof schema>,
  catalogVersionId: string,
  optionId: (setKey: string, submittedValue: string | null) => string | null,
) {
  const messages: string[] = [];

  for (const profile of profileFixtures) {
    const enrollment = profile.enrollmentData;
    const profileValues = {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      program: profile.program,
      cohort: profile.cohort,
      catalogVersionId,
      status: profile.status,
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
        enrollment.termApplied,
      ),
      genderOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorGender,
        enrollment.gender,
      ),
      civilStatusOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorCivilStatus,
        enrollment.civilStatus,
      ),
      monthlyIncomeOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorMonthlyIncome,
        enrollment.monthlyIncome,
      ),
      studentStatusOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorStudentStatus,
        enrollment.studentStatus,
      ),
      majorOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorMajor,
        enrollment.programFocus,
      ),
      specializationOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorSpecialization,
        enrollment.programApplied,
      ),
      learningHubOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorLearningHub,
        enrollment.preferredLearningHub,
      ),
      studentTypeOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorStudentType,
        enrollment.studentType,
      ),
      subStudentTypeOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorSubStudentType,
        enrollment.subStudentType,
      ),
      religionOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.religion,
        enrollment.religion,
      ),
      strandOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorStrand,
        enrollment.strand,
      ),
      lastSchoolAttended: enrollment.lastSchoolAttended,
      permanentAddressLine1: enrollment.permanentAddressLine1,
      permanentAddressLine2: enrollment.permanentAddressLine2,
      permanentAddressZipCode: enrollment.permanentAddressZipCode,
      permanentCountryOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.country,
        enrollment.permanentAddressCountry,
      ),
      permanentProvinceOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.province,
        enrollment.permanentAddressProvince,
      ),
      permanentMunicipalityOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.municipality,
        enrollment.permanentAddressCity,
      ),
      permanentBarangayOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.barangay,
        enrollment.permanentAddressBarangay,
      ),
      scholarshipInterestOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorScholarshipInterest,
        enrollment.interestedInScholarship,
      ),
      medicalConditionOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorMedicalCondition,
        enrollment.withMedicalCondition,
      ),
      guardianAssignmentOptionId: optionId(
        ENROLLMATE_OPTION_SET_KEYS.bachelorGuardianAssignment,
        enrollment.guardianType,
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
          enrollment.fatherStatus,
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
          enrollment.motherStatus,
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
        givenName: enrollment.guardianGivenName,
        familyName: enrollment.guardianFamilyName,
        email: enrollment.guardianEmail,
        occupation: enrollment.guardianOccupation,
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
          birthdate: enrollment.guardianBirthdate,
          mobile: enrollment.guardianMobile,
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
              : enrollment.permanentAddressCountry,
          ),
          addressLine1: isCurrent
            ? enrollment.currentAddressLine1
            : enrollment.permanentAddressLine1,
          addressLine2: isCurrent
            ? enrollment.currentAddressLine2
            : enrollment.permanentAddressLine2,
          provinceOptionId: optionId(
            ENROLLMATE_OPTION_SET_KEYS.province,
            isCurrent
              ? enrollment.currentAddressProvince
              : enrollment.permanentAddressProvince,
          ),
          municipalityOptionId: optionId(
            ENROLLMATE_OPTION_SET_KEYS.municipality,
            isCurrent
              ? enrollment.currentAddressCity
              : enrollment.permanentAddressCity,
          ),
          barangayOptionId: optionId(
            ENROLLMATE_OPTION_SET_KEYS.barangay,
            isCurrent
              ? enrollment.currentAddressBarangay
              : enrollment.permanentAddressBarangay,
          ),
          zipCode: isCurrent
            ? enrollment.currentAddressZipCode
            : enrollment.permanentAddressZipCode,
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
          enrollment.gender,
        ),
        civilStatusOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialCivilStatus,
          enrollment.civilStatus,
        ),
        monthlyIncomeOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialMonthlyIncome,
          enrollment.monthlyIncome,
        ),
        studentStatusOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialStudentStatus,
          enrollment.studentStatus,
        ),
        certificationOptionId: optionId(
          ENROLLMATE_OPTION_SET_KEYS.microcredentialCertification,
          enrollment.certificationField,
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
        timestampInPaymentVerification:
          profile.paymentDetails.timestampInPaymentVerification
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
