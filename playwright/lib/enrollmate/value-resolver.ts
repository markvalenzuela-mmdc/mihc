/**
 * Resolver for `createEnrollmateFixture` that returns real, Salesforce-accepted
 * values for the EnrollMate Apply Now form — the same policy the Next.js seed
 * uses (see nextjs/lib/drizzle/seed/profile/profile-form-value-policy.ts).
 *
 * The contract fixture builder calls this per field. Anything we return here is
 * used verbatim; returning `undefined` lets the builder fall back to its
 * mechanical default (first option for selects, `false` for checkboxes, a file
 * stub for uploads). We resolve every required free-text field so the builder
 * never throws "Missing fixture value".
 */
import type { EnrollmateField } from '@mihc/enrollmate-contract';

function resolveDate(name: string): string {
  // Parents/guardian are validated as >= 30 years old; the applicant is
  // college-aged. Other dates just need to be valid.
  if (/^(fthr|mthr|grdn)/.test(name)) return '1975-01-01';
  return name.includes('birthdate') ? '2003-04-18' : '2000-01-01';
}

const NAMED_VALUES: Record<string, string> = {
  birthplace: 'Quezon City',
  nickname: 'Mia',
  studentCompany: 'Mapúa Learning Solutions',
  otherStrand: 'General Academic Strand',
  lastSchoolAttended: 'Rizal National High School',
  lastschOther: 'Rizal National High School',
  medicalDiagnosisDescription: 'Managed asthma',
  grdnOtherApplRelationship: 'Aunt',
  tinNumber: '123-456-789-000',
  challenges: 'Balancing work and study time',
  referrerFirstName: 'Jose',
  referrerLastName: 'Rizal',
};

export function createEnrollmateValueResolver(email: string) {
  return (field: EnrollmateField): unknown => {
    const name = field.name.toLowerCase();

    // Typed values.
    if (field.type === 'email') return email;
    if (field.type === 'date') return resolveDate(name);
    // The mobile field is a masked input rendering "+63 9XX XXXXXXX"; it reads
    // the leading digits as the country code, so supply the full 63 + 10-digit
    // number (a leading-zero local format is misparsed and rejected).
    if (field.type === 'tel') return '639171234567';

    // Address + name real values (cascade/combobox fields have no inline options,
    // so these must come from the resolver).
    if (name.includes('country')) return 'Philippines';
    if (name.includes('province')) return 'Rizal';
    if (name.includes('citymun')) return 'Tanay';
    if (name.includes('barangay')) return 'Sampaloc';
    if (name.includes('zipcode')) return '1920';
    if (name.includes('addrline1')) return '123';
    if (name.includes('addrline2')) return 'Rizal Street, San Isidro';
    if (name.endsWith('givenname')) return 'Maria';
    if (name.endsWith('middlename')) return 'Reyes';
    if (name.endsWith('familyname')) return 'Santos';
    if (name.includes('occupation')) return 'Operations Manager';

    if (NAMED_VALUES[field.name] !== undefined) return NAMED_VALUES[field.name];

    // Generic free-text fallback so no required text field is left unresolved.
    if (field.type === 'text' || field.type === 'textarea') return 'N/A';

    // select / combobox / checkbox / file → use the builder's mechanical default.
    return undefined;
  };
}
