export type SmokeRunStatus = "success" | "degraded" | "failure";
export type TestResultStatus = "success" | "failure" | "skipped";
export type RunTrigger = "scheduled" | "manual";
export type ProfileStatus =
  | "new" | "guidance_needed" | "validated"
  | "verification" | "enrollment_confirmation"
  | "for_payment" | "payment_verification" | "completed";
export type E2eRunStatus = "running" | "completed" | "aborted";
export type E2eRunStepStatus = "queued" | "running" | "success" | "failure";

export interface OperatorSummary {
  id: string;
  name: string;
  email: string;
}

export interface SmokeAppView {
  id: string;
  name: string;
  description: string | null;
}

export interface SmokeTestResultView {
  id: string;
  testName: string;
  testFile: string | null;
  status: TestResultStatus;
  durationMs: number | null;
  errorMessage: string | null;
  errorStack: string | null;
}

export interface SmokeRunView {
  id: string;
  runNumber: number;
  appId: string;
  status: SmokeRunStatus;
  trigger: RunTrigger;
  total: number;
  passed: number;
  failed: number;
  durationSeconds: number | null;
  startedBy: OperatorSummary | null;
  checkedAt: string;
  testResults: SmokeTestResultView[];
}

export interface ProfileEnrollmentDataView {
  givenName: string | null;
  familyName: string | null;
  middleName: string | null;
  suffix: string | null;
  birthplace: string | null;
  birthdate: string | null;
  gender: string | null;
  nationality: string | null;
  civilStatus: string | null;
  monthlyIncome: string | null;
  mobile: string | null;
  landline: string | null;
  workType: string | null;
  companyOrgName: string | null;
  preferredLearningHub: string | null;
  studentType: string | null;
  subStudentType: string | null;
  studentStatus: string | null;
  religion: string | null;
  strand: string | null;
  lastSchoolAttended: string | null;
  termApplied: string | null;
  programFocus: string | null;
  programApplied: string | null;
  certificationField: string | null;
  isLeapPadReEnrollment: boolean;
  isSelfEnrolled: boolean;
  currentAddressCountry: string | null;
  currentAddressLine1: string | null;
  currentAddressLine2: string | null;
  currentAddressProvince: string | null;
  currentAddressCity: string | null;
  currentAddressBarangay: string | null;
  currentAddressZipCode: string | null;
  currentForeignAddress: string | null;
  permanentAddressCountry: string | null;
  permanentAddressLine1: string | null;
  permanentAddressLine2: string | null;
  permanentAddressProvince: string | null;
  permanentAddressCity: string | null;
  permanentAddressBarangay: string | null;
  permanentAddressZipCode: string | null;
  interestedInScholarship: string | null;
  withMedicalCondition: string | null;
  lostDate: string | null;
  lostReason: string | null;
  lostReasonSpecific: string | null;
  lostReasonRemark: string | null;
  profileLockedDate: string | null;
  subscriptionExpirationDate: string | null;
  fatherStatus: string | null;
  motherStatus: string | null;
  guardianType: string | null;
  guardianGivenName: string | null;
  guardianFamilyName: string | null;
  guardianSuffix: string | null;
  guardianBirthdate: string | null;
  guardianMobile: string | null;
  guardianEmail: string | null;
  guardianOccupation: string | null;
  guardianRelationship: string | null;
  copyGuardianAddress: boolean;
  copyPermanentGuardianAddress: boolean;
}

export interface ProfileLearnerReadinessView {
  assistanceNeedScore: number | null;
  computerDeviceAccess: string | null;
  onlineLearningPlatforms: string | null;
  softwareSkills: string | null;
  onlinePlatformsSpecified: string | null;
  internetConnectivity: string | null;
  timeCommitment: string | null;
  timeManagementEffectiveness: string | null;
  selfDisciplineConfidence: string | null;
  learningGoal: string | null;
  challengesProvided: string | null;
  potentialChallenges: string | null;
}

export interface ProfilePaymentDetailsView {
  programFee: string | null;
  needOfficialReceipt: boolean;
  promoCode: string | null;
  tinNumber: string | null;
  discountedFee: string | null;
  businessName: string | null;
  paymentMethod: string | null;
  businessTinNumber: string | null;
  proofOfPayment: string | null;
  businessAddress: string | null;
  isRenewalPayment: boolean;
  businessBir2303GDriveLink: string | null;
  proofOfPaymentGDriveLink: string | null;
  businessBir2303SubmittedDate: string | null;
  proofOfPaymentSubmittedDate: string | null;
  proofOfPaymentAaRemarks: string | null;
  timestampInPaymentVerification: string | null;
}

export interface ProfileStudyBuddyView {
  sbNominator: string | null;
  sbNomineeName: string | null;
  sbPromoCode: string | null;
  sbNomineeEmail: string | null;
}

export interface ProfileDocumentsView {
  applicantPersonalIdGDriveLink: string | null;
  proofOfHsCompletionGDriveLink: string | null;
  applicantPersonalIdSubmittedDate: string | null;
  proofOfHsCompletionSubmittedDate: string | null;
}

export interface ProfileAdditionalInfoView {
  howDidYouFindOut: string | null;
  courseraInviteSent: boolean;
  hasAppFormEdits: boolean;
  courseraInviteSentDate: string | null;
}

export interface ProfileDisclosuresView {
  dataPrivacy1: boolean;
  marketingNotifConsent: boolean;
  dataPrivacy2: boolean;
}

export interface ProfileSystemInfoView {
  isSentToApi: boolean;
  lastSentToApi: string | null;
  isApiError: boolean;
  apiErrorMessage: string | null;
  changeRecordType: string | null;
}

export interface ProfileView {
  id: string;
  name: string;
  middleName: string | null;
  email: string;
  program: string;
  cohort: string;
  status: ProfileStatus;
  enrollmentData: ProfileEnrollmentDataView;
  learnerReadiness: ProfileLearnerReadinessView | null;
  paymentDetails: ProfilePaymentDetailsView | null;
  studyBuddy: ProfileStudyBuddyView | null;
  documents: ProfileDocumentsView | null;
  additionalInfo: ProfileAdditionalInfoView | null;
  disclosures: ProfileDisclosuresView | null;
  systemInfo: ProfileSystemInfoView | null;
}

export interface E2eStepDefinitionView {
  id: string;
  label: string;
  description: string | null;
  sortOrder: number;
}

export interface E2eRunTestView {
  id: string;
  testName: string;
  status: TestResultStatus;
  durationMs: number | null;
  errorMessage: string | null;
}

export interface E2eRunStepView {
  id: string;
  stepId: string;
  status: E2eRunStepStatus;
  durationSeconds: number | null;
  note: string | null;
  tests: E2eRunTestView[];
}

export interface E2eRunView {
  id: string;
  runNumber: number;
  profileId: string;
  status: E2eRunStatus;
  startedBy: OperatorSummary | null;
  startedAt: string;
  completedAt: string | null;
  steps: E2eRunStepView[];
}

export interface SmokeAppSummary {
  latestRun: SmokeRunView | null;
  recentRuns: SmokeRunView[];
}

export const currentOperator: OperatorSummary = {
  id: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3",
  name: "Jamie Villanueva",
  email: "jamie.villanueva@mmdc.mcl.edu.ph",
};

export const smokeApps: SmokeAppView[] = [
  { id: "website", name: "Website", description: "Public marketing and admissions website" },
  { id: "enrollmate", name: "Enrollmate", description: "Student enrollment workflow" },
  { id: "enrollmate-clp", name: "Enrollmate CLP", description: "CLP enrollment support surface" },
  { id: "n8n", name: "Self-hosted n8n", description: "Automation workflow instance" },
];

const smokeRunBackfillConfig = {
  website: {
    runNumbers: [16, 15, 14, 13, 12, 11, 10, 9],
    checkedAtBase: "2026-06-28T",
    durationSeconds: 21,
    testFile: "website/smoke.spec.ts",
    testNames: ["Homepage loads", "Admissions navigation resolves", "Lead form renders", "Core assets respond"],
  },
  enrollmate: {
    runNumbers: [30, 29, 28, 27, 26, 25, 24, 23, 22],
    checkedAtBase: "2026-06-28T",
    durationSeconds: 42,
    testFile: "enrollmate/smoke.spec.ts",
    testNames: ["Login page loads", "Enrollment summary responds", "Payment status responds"],
  },
  "enrollmate-clp": {
    runNumbers: [9, 8, 7, 6, 5, 4, 3, 2, 1],
    checkedAtBase: "2026-06-28T",
    durationSeconds: 36,
    testFile: "clp/smoke.spec.ts",
    testNames: ["CLP dashboard loads", "Session endpoint responds", "Course list responds", "Support links resolve"],
  },
  n8n: {
    runNumbers: [41, 40, 39, 38, 37, 36, 35, 34, 33],
    checkedAtBase: "2026-06-28T",
    durationSeconds: 17,
    testFile: "n8n/smoke.spec.ts",
    testNames: ["Webhook health responds", "Worker heartbeat is fresh"],
  },
} satisfies Record<string, {
  runNumbers: number[];
  checkedAtBase: string;
  durationSeconds: number;
  testFile: string;
  testNames: string[];
}>;

function createSmokeRunHistory(appId: keyof typeof smokeRunBackfillConfig): SmokeRunView[] {
  const config = smokeRunBackfillConfig[appId];

  return config.runNumbers.map((runNumber, index) => {
    const hasFailure = index % 4 === 1;
    const hasSkipped = index % 5 === 2;
    const status: SmokeRunStatus = hasFailure ? "degraded" : "success";
    const passed = hasFailure ? config.testNames.length - 1 : config.testNames.length;
    const failed = hasFailure ? 1 : 0;

    return {
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(8, "0")}${String(runNumber).padStart(4, "0")}`,
      runNumber,
      appId,
      status,
      trigger: index % 3 === 0 ? "manual" : "scheduled",
      total: config.testNames.length,
      passed,
      failed,
      durationSeconds: config.durationSeconds + index * 2,
      startedBy: index % 3 === 0 ? currentOperator : null,
      checkedAt: `${config.checkedAtBase}${String(13 - index).padStart(2, "0")}:10:00+08:00`,
      testResults: config.testNames.map((testName, testIndex) => {
        const isFailure = hasFailure && testIndex === 1;
        const isSkipped = hasSkipped && testIndex === config.testNames.length - 1;

        return {
          id: `${appId}-${runNumber}-${testIndex + 1}`,
          testName,
          testFile: testIndex === config.testNames.length - 1 ? null : config.testFile,
          status: isFailure ? "failure" : isSkipped ? "skipped" : "success",
          durationMs: isSkipped ? null : 3200 + testIndex * 850 + index * 120,
          errorMessage: isFailure
            ? "1 check failed on https://mmdc.mcl.edu.ph/certifications/meta-front-end-developer:\n• Expected page content did not render"
            : null,
          errorStack: null,
        };
      }),
    };
  });
}

export const smokeRuns: SmokeRunView[] = [
  {
    id: "a37acbf2-19c4-4fb1-b39f-d3abf5fd7121",
    runNumber: 18,
    appId: "website",
    status: "success",
    trigger: "scheduled",
    total: 4,
    passed: 4,
    failed: 0,
    durationSeconds: 18,
    startedBy: null,
    checkedAt: "2026-06-29T14:10:00+08:00",
    testResults: [
      { id: "4adfd0aa-1", testName: "Homepage loads", testFile: "website/smoke.spec.ts", status: "success", durationMs: 4200, errorMessage: null, errorStack: null },
      { id: "4adfd0aa-2", testName: "Admissions navigation resolves", testFile: "website/smoke.spec.ts", status: "success", durationMs: 3900, errorMessage: null, errorStack: null },
      { id: "4adfd0aa-3", testName: "Lead form renders", testFile: "website/lead-form.spec.ts", status: "success", durationMs: 5100, errorMessage: null, errorStack: null },
      { id: "4adfd0aa-4", testName: "Core assets respond", testFile: null, status: "success", durationMs: 3600, errorMessage: null, errorStack: null },
    ],
  },
  {
    id: "7a4020db-0e48-4651-a965-e6e212c10322",
    runNumber: 17,
    appId: "website",
    status: "degraded",
    trigger: "manual",
    total: 4,
    passed: 3,
    failed: 1,
    durationSeconds: 26,
    startedBy: currentOperator,
    checkedAt: "2026-06-29T12:42:00+08:00",
    testResults: [
      { id: "b3b0fd40-1", testName: "Homepage loads", testFile: "website/smoke.spec.ts", status: "success", durationMs: 4100, errorMessage: null, errorStack: null },
      { id: "b3b0fd40-2", testName: "Admissions navigation resolves", testFile: "website/smoke.spec.ts", status: "success", durationMs: 4200, errorMessage: null, errorStack: null },
      { id: "b3b0fd40-3", testName: "Lead form submits", testFile: "website/lead-form.spec.ts", status: "failure", durationMs: 12800, errorMessage: "Expected confirmation message was not visible.", errorStack: "TimeoutError: locator('[data-testid=lead-confirmation]') timed out after 10000ms" },
      { id: "b3b0fd40-4", testName: "Core assets respond", testFile: null, status: "skipped", durationMs: null, errorMessage: null, errorStack: null },
    ],
  },
  {
    id: "4fa1b723-d658-414a-9e50-05418a6d5298",
    runNumber: 31,
    appId: "enrollmate",
    status: "failure",
    trigger: "scheduled",
    total: 3,
    passed: 1,
    failed: 2,
    durationSeconds: 45,
    startedBy: null,
    checkedAt: "2026-06-29T14:05:00+08:00",
    testResults: [
      { id: "4cc97274-1", testName: "Login page loads", testFile: "enrollmate/smoke.spec.ts", status: "success", durationMs: 6200, errorMessage: null, errorStack: null },
      { id: "4cc97274-2", testName: "Enrollment summary responds", testFile: "enrollmate/smoke.spec.ts", status: "failure", durationMs: 20100, errorMessage: "Enrollment summary returned HTTP 503.", errorStack: "Error: expected response.ok() to be truthy" },
      { id: "4cc97274-3", testName: "Payment status responds", testFile: "enrollmate/smoke.spec.ts", status: "failure", durationMs: 18700, errorMessage: "Payment status request timed out.", errorStack: null },
    ],
  },
  {
    id: "ee4229a8-bd46-44c6-a6c3-67cc7dafee36",
    runNumber: 10,
    appId: "enrollmate-clp",
    status: "degraded",
    trigger: "scheduled",
    total: 4,
    passed: 3,
    failed: 1,
    durationSeconds: 39,
    startedBy: null,
    checkedAt: "2026-06-29T13:58:00+08:00",
    testResults: [
      { id: "6f324d35-1", testName: "CLP dashboard loads", testFile: "clp/smoke.spec.ts", status: "failure", durationMs: 16400, errorMessage: "Dashboard returned HTTP 500.", errorStack: null },
      { id: "6f324d35-2", testName: "Session endpoint responds", testFile: "clp/smoke.spec.ts", status: "success", durationMs: 5100, errorMessage: null, errorStack: null },
      { id: "6f324d35-3", testName: "Course list responds", testFile: "clp/smoke.spec.ts", status: "success", durationMs: 7300, errorMessage: null, errorStack: null },
      { id: "6f324d35-4", testName: "Support links resolve", testFile: null, status: "success", durationMs: 3600, errorMessage: null, errorStack: null },
    ],
  },
  {
    id: "d495a21e-a89d-4ab6-a191-812f785e482e",
    runNumber: 42,
    appId: "n8n",
    status: "success",
    trigger: "scheduled",
    total: 2,
    passed: 2,
    failed: 0,
    durationSeconds: 16,
    startedBy: null,
    checkedAt: "2026-06-29T14:11:00+08:00",
    testResults: [
      { id: "5aa5ccb2-1", testName: "Webhook health responds", testFile: "n8n/smoke.spec.ts", status: "success", durationMs: 6500, errorMessage: null, errorStack: null },
      { id: "5aa5ccb2-2", testName: "Worker heartbeat is fresh", testFile: "n8n/smoke.spec.ts", status: "success", durationMs: 7100, errorMessage: null, errorStack: null },
    ],
  },
  ...createSmokeRunHistory("website"),
  ...createSmokeRunHistory("enrollmate"),
  ...createSmokeRunHistory("enrollmate-clp"),
  ...createSmokeRunHistory("n8n"),
];

const ariEnrollment: ProfileEnrollmentDataView = {
  givenName: "Ari", familyName: "Santos", middleName: null, suffix: null, birthplace: "Makati City", birthdate: "2007-03-14", gender: "Female", nationality: "Filipino", civilStatus: "Single", monthlyIncome: "Below PHP 20,000", mobile: "+63 917 555 0142", landline: null, workType: null, companyOrgName: null, preferredLearningHub: "Makati", studentType: "Freshman", subStudentType: "Senior High School Graduate", studentStatus: "New", religion: "Catholic", strand: "STEM", lastSchoolAttended: "Makati Science High School", termApplied: "Term 1 AY 2026-2027", programFocus: "Technology", programApplied: "BS Information Technology", certificationField: null, isLeapPadReEnrollment: false, isSelfEnrolled: false, currentAddressCountry: "Philippines", currentAddressLine1: "1421 J. P. Rizal Avenue", currentAddressLine2: null, currentAddressProvince: "Metro Manila", currentAddressCity: "Makati City", currentAddressBarangay: "Poblacion", currentAddressZipCode: "1210", currentForeignAddress: null, permanentAddressCountry: "Philippines", permanentAddressLine1: "1421 J. P. Rizal Avenue", permanentAddressLine2: null, permanentAddressProvince: "Metro Manila", permanentAddressCity: "Makati City", permanentAddressBarangay: "Poblacion", permanentAddressZipCode: "1210", interestedInScholarship: "Yes", withMedicalCondition: "No", lostDate: null, lostReason: null, lostReasonSpecific: null, lostReasonRemark: null, profileLockedDate: null, subscriptionExpirationDate: null, fatherStatus: "Living", motherStatus: "Living", guardianType: "Mother", guardianGivenName: "Liza", guardianFamilyName: "Santos", guardianSuffix: null, guardianBirthdate: "1982-08-06", guardianMobile: "+63 917 555 0188", guardianEmail: "liza.santos@example.com", guardianOccupation: "Accountant", guardianRelationship: "Mother", copyGuardianAddress: true, copyPermanentGuardianAddress: true,
};

const emptyLearnerReadiness: ProfileLearnerReadinessView = {
  assistanceNeedScore: null, computerDeviceAccess: null, onlineLearningPlatforms: null, softwareSkills: null, onlinePlatformsSpecified: null, internetConnectivity: null, timeCommitment: null, timeManagementEffectiveness: null, selfDisciplineConfidence: null, learningGoal: null, challengesProvided: null, potentialChallenges: null,
};

const emptyPaymentDetails: ProfilePaymentDetailsView = {
  programFee: null, needOfficialReceipt: false, promoCode: null, tinNumber: null, discountedFee: null, businessName: null, paymentMethod: null, businessTinNumber: null, proofOfPayment: null, businessAddress: null, isRenewalPayment: false, businessBir2303GDriveLink: null, proofOfPaymentGDriveLink: null, businessBir2303SubmittedDate: null, proofOfPaymentSubmittedDate: null, proofOfPaymentAaRemarks: null, timestampInPaymentVerification: null,
};

const emptyStudyBuddy: ProfileStudyBuddyView = {
  sbNominator: null, sbNomineeName: null, sbPromoCode: null, sbNomineeEmail: null,
};

const emptyDocuments: ProfileDocumentsView = {
  applicantPersonalIdGDriveLink: null, proofOfHsCompletionGDriveLink: null, applicantPersonalIdSubmittedDate: null, proofOfHsCompletionSubmittedDate: null,
};

const emptyAdditionalInfo: ProfileAdditionalInfoView = {
  howDidYouFindOut: null, courseraInviteSent: false, hasAppFormEdits: false, courseraInviteSentDate: null,
};

const emptyDisclosures: ProfileDisclosuresView = {
  dataPrivacy1: false, marketingNotifConsent: false, dataPrivacy2: false,
};

const emptySystemInfo: ProfileSystemInfoView = {
  isSentToApi: false, lastSentToApi: null, isApiError: false, apiErrorMessage: null, changeRecordType: null,
};

export const profiles: ProfileView[] = [
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40101", name: "Ari Santos", middleName: null, email: "ari.santos@example.edu", program: "BS Information Technology", cohort: "2026-A", status: "validated", enrollmentData: ariEnrollment, learnerReadiness: emptyLearnerReadiness, paymentDetails: emptyPaymentDetails, studyBuddy: emptyStudyBuddy, documents: emptyDocuments, additionalInfo: emptyAdditionalInfo, disclosures: emptyDisclosures, systemInfo: emptySystemInfo },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40102", name: "Mika Reyes", middleName: null, email: "mika.reyes@example.edu", program: "BS Business Administration", cohort: "2026-A", status: "new", enrollmentData: { ...ariEnrollment, givenName: "Mika", familyName: "Reyes", programApplied: "BS Business Administration", programFocus: "Business", strand: "ABM", guardianGivenName: "Paolo", guardianFamilyName: "Reyes" }, learnerReadiness: emptyLearnerReadiness, paymentDetails: emptyPaymentDetails, studyBuddy: emptyStudyBuddy, documents: emptyDocuments, additionalInfo: emptyAdditionalInfo, disclosures: emptyDisclosures, systemInfo: emptySystemInfo },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40103", name: "Noel Cruz", middleName: null, email: "noel.cruz@example.edu", program: "BS Computer Science", cohort: "2025-B", status: "guidance_needed", enrollmentData: { ...ariEnrollment, givenName: "Noel", familyName: "Cruz", programApplied: "BS Computer Science", mobile: null, currentAddressBarangay: null, guardianEmail: null, interestedInScholarship: null }, learnerReadiness: emptyLearnerReadiness, paymentDetails: emptyPaymentDetails, studyBuddy: emptyStudyBuddy, documents: emptyDocuments, additionalInfo: emptyAdditionalInfo, disclosures: emptyDisclosures, systemInfo: emptySystemInfo },
  { id: "3591b2d2-886b-45c6-bcbd-3c8756b40104", name: "Sam Lim", middleName: null, email: "sam.lim@example.edu", program: "Bachelor of Secondary Education", cohort: "2025-B", status: "completed", enrollmentData: { ...ariEnrollment, givenName: "Sam", familyName: "Lim", programApplied: "Bachelor of Secondary Education", programFocus: "Education", strand: "HUMSS" }, learnerReadiness: emptyLearnerReadiness, paymentDetails: emptyPaymentDetails, studyBuddy: emptyStudyBuddy, documents: emptyDocuments, additionalInfo: emptyAdditionalInfo, disclosures: emptyDisclosures, systemInfo: emptySystemInfo },
];

export const e2eStepDefinitions: E2eStepDefinitionView[] = [
  { id: "new", label: "New", description: "Profile is newly created and awaiting initial guidance review.", sortOrder: 1 },
  { id: "guidance_needed", label: "Guidance needed", description: "Profile requires guidance or admissions follow-up before validation.", sortOrder: 2 },
  { id: "validated", label: "Validated", description: "Profile details have passed validation and can move into verification.", sortOrder: 3 },
  { id: "verification", label: "Verification", description: "Profile is under enrollment or document verification.", sortOrder: 4 },
  { id: "enrollment_confirmation", label: "Enrollment confirmation", description: "Profile is ready for enrollment confirmation checks.", sortOrder: 5 },
  { id: "for_payment", label: "For payment", description: "Profile is ready for payment instructions or collection.", sortOrder: 6 },
  { id: "payment_verification", label: "Payment verification", description: "Payment evidence is being verified.", sortOrder: 7 },
  { id: "completed", label: "Completed", description: "Profile has completed the enrollment workflow.", sortOrder: 8 },
];

const e2eRunHistoryConfig = [
  { profileIndex: 0, runNumbers: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2], dayStart: 19 },
  { profileIndex: 1, runNumbers: [17, 16, 15, 14, 13, 12, 11, 10, 9, 8], dayStart: 18 },
  { profileIndex: 2, runNumbers: [13, 12, 11, 10, 9, 8, 7, 6, 5, 4], dayStart: 14 },
  { profileIndex: 3, runNumbers: [14, 13, 12, 11, 10, 9, 8, 7, 6, 5], dayStart: 18 },
] satisfies {
  profileIndex: number;
  runNumbers: number[];
  dayStart: number;
}[];

function createE2eRunHistory({
  profileIndex,
  runNumbers,
  dayStart,
}: (typeof e2eRunHistoryConfig)[number]): E2eRunView[] {
  const profile = profiles[profileIndex];
  const profileToken = String(profileIndex + 1).padStart(4, "0");

  return runNumbers.map((runNumber, index) => {
    const hasFailure = index % 4 === 1;
    const isAborted = index % 7 === 3;
    const status: E2eRunStatus = isAborted ? "aborted" : "completed";
    const day = String(dayStart + index).padStart(2, "0");
    const hour = String(9 + (index % 6)).padStart(2, "0");

    return {
      id: `00000000-0000-4000-8000-${profileToken}${String(runNumber).padStart(8, "0")}`,
      runNumber,
      profileId: profile.id,
      status,
      startedBy: index % 3 === 0 ? currentOperator : null,
      startedAt: `2026-06-${day}T${hour}:05:00+08:00`,
      completedAt: `2026-06-${day}T${hour}:10:${String(20 + index).padStart(2, "0")}+08:00`,
      steps: e2eStepDefinitions.map((step, stepIndex) => {
        const didRunStep = !isAborted || stepIndex < 2;
        const didFailStep = hasFailure && stepIndex === 2;
        const stepStatus: E2eRunStepStatus = !didRunStep ? "queued" : didFailStep ? "failure" : "success";

        return {
          id: `history-${profileIndex + 1}-${runNumber}-${stepIndex + 1}`,
          stepId: step.id,
          status: stepStatus,
          durationSeconds: didRunStep ? 42 + stepIndex * 9 + index : null,
          note: !didRunStep
            ? "Run ended before this step started."
            : didFailStep
              ? `${step.label} produced a validation mismatch.`
              : `${step.label} completed against the seeded profile.`,
          tests: didRunStep
            ? [
                {
                  id: `history-${profileIndex + 1}-${runNumber}-${stepIndex + 1}-1`,
                  testName: didFailStep ? `${step.label} validation recovers` : `${step.label} assertions pass`,
                  status: didFailStep ? "failure" : "success",
                  durationMs: 2600 + stepIndex * 380 + index * 90,
                  errorMessage: didFailStep ? "Expected validation state did not clear before timeout." : null,
                },
              ]
            : [],
        };
      }),
    };
  });
}

export const e2eRuns: E2eRunView[] = [
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f501",
    runNumber: 12,
    profileId: profiles[0].id,
    status: "completed",
    startedBy: currentOperator,
    startedAt: "2026-06-29T11:28:00+08:00",
    completedAt: "2026-06-29T11:32:41+08:00",
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5001-${index}`, stepId: step.id, status: "success", durationSeconds: 48 + index * 11, note: `${step.label} completed against the configured profile.`, tests: [{ id: `ea5001-${index}-1`, testName: `${step.label} assertions pass`, status: "success", durationMs: 2800 + index * 420, errorMessage: null }] })),
  },
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f502",
    runNumber: 7,
    profileId: profiles[1].id,
    status: "completed",
    startedBy: null,
    startedAt: "2026-06-28T16:07:00+08:00",
    completedAt: "2026-06-28T16:12:19+08:00",
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5002-${index}`, stepId: step.id, status: index === 2 ? "failure" : "success", durationSeconds: 52 + index * 8, note: index === 2 ? "Profile status validation did not resolve." : `${step.label} completed.`, tests: [{ id: `ea5002-${index}-1`, testName: index === 2 ? "Profile status validation clears" : `${step.label} assertions pass`, status: index === 2 ? "failure" : index === 3 ? "skipped" : "success", durationMs: index === 2 ? 10100 : 3100, errorMessage: index === 2 ? "Validation message remained visible after entering valid profile data." : null }] })),
  },
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f503",
    runNumber: 3,
    profileId: profiles[2].id,
    status: "aborted",
    startedBy: currentOperator,
    startedAt: "2026-06-24T09:40:00+08:00",
    completedAt: "2026-06-24T09:41:12+08:00",
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5003-${index}`, stepId: step.id, status: index === 0 ? "success" : index === 1 ? "failure" : "queued", durationSeconds: index < 2 ? 34 : null, note: index === 1 ? "Required mobile number was missing from profile data." : index > 1 ? "Run aborted before this status step started." : `${step.label} completed.`, tests: index < 2 ? [{ id: `ea5003-${index}-1`, testName: index === 1 ? "Student mobile is populated" : `${step.label} status checks pass`, status: index === 1 ? "failure" : "success", durationMs: 2100, errorMessage: index === 1 ? "Profile mobile value is empty." : null }] : [] })),
  },
  {
    id: "dd71418a-90e0-49ec-98ad-ff14a806f504",
    runNumber: 4,
    profileId: profiles[3].id,
    status: "running",
    startedBy: currentOperator,
    startedAt: "2026-06-29T14:18:00+08:00",
    completedAt: null,
    steps: e2eStepDefinitions.map((step, index) => ({ id: `ea5004-${index}`, stepId: step.id, status: index === 0 ? "success" : index === 1 ? "running" : "queued", durationSeconds: index === 0 ? 38 : null, note: index === 0 ? `${step.label} completed.` : index === 1 ? "Running profile status checks." : "Waiting for the preceding status step.", tests: index === 0 ? [{ id: "ea5004-0-1", testName: `${step.label} status checks pass`, status: "success", durationMs: 2400, errorMessage: null }] : [] })),
  },
  ...e2eRunHistoryConfig.flatMap(createE2eRunHistory),
];

export function getSmokeRunsForApp(appId: string, runs: SmokeRunView[]) {
  return runs
    .filter((run) => run.appId === appId)
    .sort((a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt));
}

export function getSmokeAppSummary(appId: string, runs: SmokeRunView[]): SmokeAppSummary {
  const appRuns = getSmokeRunsForApp(appId, runs);
  return { latestRun: appRuns[0] ?? null, recentRuns: appRuns.slice(0, 5) };
}

export function getNextSmokeRunNumber(appId: string, runs: SmokeRunView[]) {
  return Math.max(0, ...runs.filter((run) => run.appId === appId).map((run) => run.runNumber)) + 1;
}

export function getE2eRunsForProfile(profileId: string, runs: E2eRunView[]) {
  return runs
    .filter((run) => run.profileId === profileId)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function getNextE2eRunNumber(profileId: string, runs: E2eRunView[]) {
  return Math.max(0, ...runs.filter((run) => run.profileId === profileId).map((run) => run.runNumber)) + 1;
}

export function formatTimestamp(value: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatDurationSeconds(value: number | null) {
  if (value === null) return "Not available";
  if (value < 60) return `${value}s`;
  const minutes = Math.floor(value / 60);
  return `${minutes}m ${value % 60}s`;
}

export function formatDurationMs(value: number | null) {
  if (value === null) return "Not available";
  return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`;
}
