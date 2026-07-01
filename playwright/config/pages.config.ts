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

/** Admissions overview — hosts the tuition calculator widget (slider + dropdown). */
export const ADMISSIONS: PageDescriptor = {
  id: 'smoke-admissions',
  type: 'smoke',
  path: '/admissions/',
  ctas: [{ name: 'Enroll Now', expectedHrefPattern: ENROLLMATE }],
};

/** Quiz landing — the entry point is a "START QUIZ" button (asserted in the spec). */
export const QUIZ: PageDescriptor = {
  id: 'smoke-quiz',
  type: 'smoke',
  path: '/quiz/',
  ctas: [{ name: 'Enroll Now', expectedHrefPattern: ENROLLMATE }],
};

/**
 * BSIT lead-capture form page (form renders — asserted in the spec).
 * This is a dedicated Unbounce landing page that intentionally hides the global
 * site header and footer (both `display:none`) for a distraction-free form, so —
 * unlike every other page — it carries no header "Enroll Now" CTA. The lead form
 * itself is the only content asserted.
 */
export const BSIT_LEAD_FORM: PageDescriptor = {
  id: 'smoke-bsit-lead-form',
  type: 'smoke',
  path: '/bsit-lead-form/',
  ctas: [],
};

export const ABOUT: PageDescriptor = {
  id: 'smoke-about',
  type: 'smoke',
  path: '/about-mmdc/',
  ctas: [{ name: 'Enroll Now', expectedHrefPattern: ENROLLMATE }],
};

export const NEWS_OVERVIEW: PageDescriptor = {
  id: 'smoke-news-overview',
  type: 'smoke',
  path: '/news-and-events/',
  ctas: [{ name: 'Enroll Now', expectedHrefPattern: ENROLLMATE }],
};

/**
 * Search page: its <main> holds only the search widget (an <h4>Search</h4> plus
 * an input), so it falls well short of the default 200-char key-content
 * threshold — pin keyContent to the widget heading.
 */
export const SEARCH: PageDescriptor = {
  id: 'smoke-search',
  type: 'smoke',
  path: '/search/',
  keyContent: 'main h4',
  ctas: [{ name: 'Enroll Now', expectedHrefPattern: ENROLLMATE }],
};

export const STATE_OF_WORKING_STUDENTS: PageDescriptor = {
  id: 'smoke-state-of-working-students',
  type: 'smoke',
  path: '/state-of-working-students/',
  ctas: [{ name: 'Enroll Now', expectedHrefPattern: ENROLLMATE }],
};

/**
 * Scholarship / discount pages plus the two financial tools that live under
 * /admissions/ → /admissions/<slug>/. All share the same shape (standard
 * content + a primary header Enroll Now CTA), so they use one factory + loop.
 */
export const admissionsAidSlugs = [
  'abanse-negrense-scholarship',
  'asenso',
  'city-scholarships',
  'continuing-education',
  'family-discount',
  'gadget-scholarship',
  'next-gen',
  'ygc-ayala-discount',
  'financial-assistance',
  'tuition-calculator',
  'financial-wellness-checker',
] as const;

export function admissionsAidDescriptor(slug: string): PageDescriptor {
  return {
    id: `smoke-admissions-${slug}`,
    type: 'smoke',
    path: `/admissions/${slug}/`,
    ctas: [
      {
        name: 'Enroll Now',
        expectedHrefPattern: ENROLLMATE,
        primary: true,
        expectedDestination: ENROLLMATE,
      },
    ],
  };
}

/** Financing programs that live at the site root (not under /admissions/). */
export const financialLoanSlugs = ['study-now-pay-later', 'bukas'] as const;

export function financialLoanDescriptor(slug: string): PageDescriptor {
  return {
    id: `smoke-financial-${slug}`,
    type: 'smoke',
    path: `/${slug}/`,
    ctas: [
      {
        name: 'Enroll Now',
        expectedHrefPattern: ENROLLMATE,
        primary: true,
        expectedDestination: ENROLLMATE,
      },
    ],
  };
}

/**
 * News & Events category landing pages → /news-and-events/<slug>/.
 * These redirect to /page/1/ but still resolve HTTP 200. The overview links all
 * of them (used for a coverage assertion).
 */
export const newsCategories = [
  'lifestyle-career-tips',
  'events-scholarships',
  'mmdc-in-the-news',
] as const;

export function newsCategoryDescriptor(slug: string): PageDescriptor {
  return {
    id: `smoke-news-${slug}`,
    type: 'smoke',
    path: `/news-and-events/${slug}/`,
    ctas: [{ name: 'Enroll Now', expectedHrefPattern: ENROLLMATE }],
  };
}
