/**
 * Canonical catalog of MMDC website pages under smoke test.
 *
 * Enumeration is intentionally hardcoded so the suite is
 * deterministic. When the live catalog changes, update the slug arrays below.
 * Last verified against the live site on 2026-06-29.
 */

/** A call-to-action to check on a page. */
export interface Cta {
  /** Accessible name of the link (case-insensitive substring match). */
  name: string;
  /** Regex source the link's href must match. */
  expectedHrefPattern: string;
  /** Exactly one CTA per page should be primary — it gets clicked. */
  primary?: boolean;
  /** Regex source the resulting URL must match after clicking (primary only). */
  expectedDestination?: string;
}

export interface PageDescriptor {
  /** Stable test id, also used as the result filename prefix. */
  id: string;
  type: 'smoke';
  /** Path relative to baseURL. */
  path: string;
  /** Selector for key content that must render. Defaults to 'main'. */
  keyContent?: string;
  ctas: Cta[];
}

// Reusable href patterns.
const ENROLLMATE = 'enrollmate\\.mmdc\\.mcl\\.edu\\.ph';
const LEAD_FORM = 'lead-form';
const FAQ_PATH = '/faq';
const QUIZ_PATH = '/quiz';
const COLLEGE_PATH = '/college-programs/';

export const LANDING: PageDescriptor = {
  id: 'smoke-landing',
  type: 'smoke',
  path: '/',
  ctas: [
    { name: 'Enroll Now', expectedHrefPattern: ENROLLMATE },
    {
      name: 'Apply Now',
      expectedHrefPattern: ENROLLMATE,
      primary: true,
      expectedDestination: ENROLLMATE,
    },
    { name: 'Inquire Now', expectedHrefPattern: LEAD_FORM },
    { name: 'Find Your Path', expectedHrefPattern: QUIZ_PATH },
    { name: 'Download Brochure', expectedHrefPattern: LEAD_FORM },
  ],
};

export const CERTIFICATIONS_OVERVIEW: PageDescriptor = {
  id: 'smoke-certifications-overview',
  type: 'smoke',
  path: '/certification-programs/',
  ctas: [
    {
      name: 'Download the Certification Programs Brochure',
      expectedHrefPattern: LEAD_FORM,
    },
    {
      name: 'Enroll Now',
      expectedHrefPattern: ENROLLMATE,
      primary: true,
      expectedDestination: ENROLLMATE,
    },
    { name: 'GENERAL FAQs', expectedHrefPattern: FAQ_PATH },
  ],
};

export const COLLEGE_OVERVIEW: PageDescriptor = {
  id: 'smoke-college-overview',
  type: 'smoke',
  path: '/college-programs/',
  // Primary CTA: the first internal "Learn More" should navigate to a program page.
  ctas: [
    {
      name: 'Learn More',
      expectedHrefPattern: COLLEGE_PATH,
      primary: true,
      expectedDestination: COLLEGE_PATH,
    },
  ],
};

export const FAQ: PageDescriptor = {
  id: 'smoke-faq',
  type: 'smoke',
  path: '/faq/',
  // FAQ key content + accordion interaction are asserted directly in the spec.
  // (The in-content "Apply here" links live inside collapsed accordions, so we
  // check the always-visible header Enroll Now CTA instead.)
  ctas: [{ name: 'Enroll Now', expectedHrefPattern: ENROLLMATE }],
};

/**
 * College program slugs → /college-programs/<slug>/.
 * The college overview page links all of these (used for coverage assertion).
 */
export const collegePrograms = [
  'ba-ai',
  'marketing-management',
  'operations-management',
  'hr-management',
  'it-ai',
  'data-analytics',
  'software-development',
  'network-and-cybersecurity',
] as const;

/**
 * Certification slugs → /certification-programs/<slug>/.
 * These appear only in the footer sitemap (the cert overview uses accordions).
 */
export const certifications = [
  'content-creator',
  'ai',
  'esl-instructor',
  'digital-marketing',
  'data-analytics',
  'ibm-data-engineering',
  'ibm-full-stack-software-developer',
  'ibm-data-science',
  'ielts-preparation',
  'meta-database-engineer',
  'meta-front-end-developer',
  'virtual-assistance',
] as const;

/** Descriptor for an individual college program detail page. */
export function programDescriptor(slug: string): PageDescriptor {
  return {
    id: `smoke-program-${slug}`,
    type: 'smoke',
    path: `${COLLEGE_PATH}${slug}/`,
    ctas: [
      {
        name: 'Apply Now',
        expectedHrefPattern: ENROLLMATE,
        primary: true,
        expectedDestination: ENROLLMATE,
      },
      { name: 'Inquire Now', expectedHrefPattern: LEAD_FORM },
    ],
  };
}

/** Descriptor for an individual certification detail page. */
export function certificationDescriptor(slug: string): PageDescriptor {
  return {
    id: `smoke-cert-${slug}`,
    type: 'smoke',
    path: `/certification-programs/${slug}/`,
    ctas: [
      {
        name: 'Apply Now',
        expectedHrefPattern: ENROLLMATE,
        primary: true,
        expectedDestination: ENROLLMATE,
      },
      { name: 'FAQs', expectedHrefPattern: FAQ_PATH },
    ],
  };
}
