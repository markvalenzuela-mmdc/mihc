# Last School Attended Options Design

## Context

The shared EnrollMate definition currently models `lastSchoolAttended` as an external combobox. The Next.js profile form therefore receives an empty options array because no runtime school-search integration supplies results. Profile seeds also use the generic external-combobox mock path, which generates arbitrary text instead of a known school.

Repository tests already describe an unfinished deterministic contract: a reusable `lastSchoolAttendedOptions` set with ten entries and conditional behavior controlled by `schoolNotFound`. The matching option payload was recovered from dangling git history, and every value was verified against the live EnrollMate UAT bachelors application on 2026-07-20.

## Decision

Restore the verified ten-school snapshot as `reusableOptionSets.lastSchoolAttendedOptions` in the shared EnrollMate definition:

1. Mapua University-Makati
2. Mapua University-Manila
3. Rizal National High School
4. Manila Science High School
5. Philippine Science High School
6. Ateneo de Manila University, Inc.
7. De La Salle-Araneta University
8. University of Santo Tomas
9. Adamson University
10. Polytechnic University of the Philippines

Change `lastSchoolAttended` to use the reusable set. It is visible and required when `schoolNotFound` is `false`. When `schoolNotFound` is `true`, the existing `lastschOther` field remains the required manual-entry path.

The package definition remains the source of truth. Next.js and Playwright consumers must obtain these options through `@mihc/enrollmate-contract`; no duplicate application-owned school list will be introduced.

## Data Flow

1. The shared JSON definition declares the reusable school options.
2. `parseEnrollmateDefinition` resolves the reusable option source into normalized field options.
3. The Next.js form renderer receives the normalized options and renders them through its existing select/combobox control.
4. Profile seed generation selects a value from the same normalized option set instead of generating arbitrary lorem text.
5. The shared validator enforces the primary-school or manual-school branch according to `schoolNotFound`.

## Alternatives Considered

### Runtime UAT search proxy

This would preserve the full live async-search behavior, but it would add networking, availability, CORS, and possible authentication concerns. It is outside the ticket's deterministic package-and-seed scope.

### Preserve external free entry and only fix seeds

This would make seed records realistic but would leave the profile form without suggestions, so it does not solve the reported problem.

## Testing

- Keep the existing shared-contract assertions for the ten-entry reusable option set, representative UAT value, normalized option source, and conditional validation.
- Add a seed regression assertion that bachelor seed data contains a `lastSchoolAttended` value drawn from the shared reusable option set when the manual-school branch is inactive.
- Run the focused Next.js contract, profile-definition, seed, fixture, and validation tests.
- Run the Playwright server EnrollMate contract test because it consumes the same package boundary.
- Run `git diff --check` and inspect the final diff for unrelated changes.

## Scope Boundaries

- No runtime API or UAT proxy.
- No new UI component or form-state architecture.
- No database migration; profile form data is JSONB and existing seed upserts replace the generated data.
- No separate option list under `nextjs/` or `playwright/`.

## Success Criteria

- Creating or editing a bachelor profile displays the ten verified school options.
- Selecting the school-not-found checkbox uses the manual entry field instead of requiring a listed school.
- Generated bachelor seed data uses a listed school value.
- Relevant shared-contract and consumer tests pass.
