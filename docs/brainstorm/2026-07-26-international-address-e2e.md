# International Address E2E Support

**Status:** Approved for implementation planning

## Context

The EnrollMate UAT form supports two mutually exclusive address shapes:

- Philippine addresses use floor/building/house number, street, province,
  city/municipality, barangay, and zipcode fields.
- Non-Philippine addresses use one required foreign-address textarea.

The shared `@mihc/enrollmate-contract` definition currently describes only the
Philippine branch. When a saved E2E profile selects another country, the UAT
form hides the Philippine controls, but the contract-driven Next.js editor and
Playwright runner do not know about the foreign-address control. The run cannot
fill the required textarea and cannot advance.

The direct UAT bachelors route was inspected on 2026-07-26. Selecting Angola
confirmed these controls:

| Address | Label | DOM name/id | Type |
|---|---|---|---|
| Applicant current | Current Foreign Address | `curraddrForeign` | `textarea` |
| Applicant permanent | Permanent Foreign Address | `permaddrForeign` | `textarea` |

Parent and guardian fields follow the existing address prefixes:
`fthrCurraddrForeign`, `fthrPermaddrForeign`, `mthrCurraddrForeign`,
`mthrPermaddrForeign`, `grdnCurraddrForeign`, and `grdnPermaddrForeign`.
Microcredentials reuse `curraddrForeign`.

## Requirements

- Add the UAT foreign-address textarea for every applicant, parent, and guardian
  current/permanent address represented by a flow.
- Require the textarea when its country is not `Philippines`.
- Preserve the existing Philippine controls and validation when the selected
  country is `Philippines`.
- Preserve parent visibility: father and mother address fields apply only when
  their living status is `Living`.
- Preserve guardian visibility: guardian address fields apply only when
  `guardian` is `Others`.
- Allow the Next.js profile editor to capture and persist the foreign address.
- Allow the Playwright/Hono automated path to forward and fill the saved value
  without a consumer-specific field map.
- Exercise the international path with Angola while retaining regression
  coverage for Philippine addresses.

## Considered approaches

### 1. Extend shared visibility conditions

Allow a field to declare multiple AND conditions and allow a condition to use
either `equalsAny` or `notEqualsAny`. Put evaluation in the shared package and
reuse it in validation, fixture generation, Next.js, and Playwright.

This is the approved approach. It models UAT behavior directly and keeps the
shared package authoritative.

### 2. Enumerate every non-Philippine country

Keep only `equalsAny` and repeat every country except `Philippines` on each
foreign-address field. This still needs compound conditions for parent and
guardian fields, creates large repeated lists, and drifts when the country
catalog changes.

### 3. Special-case address prefixes in each consumer

Infer visibility from field names independently in Next.js and Playwright.
This produces a smaller initial contract change but duplicates business rules
outside the source of truth and leaves package validation inaccurate.

## Approved design

### Shared condition model

Existing single conditions remain valid. A visibility condition may also be an
array, interpreted as logical AND. Each condition contains a `field` and
exactly one of:

```json
{ "field": "curraddrCountry", "equalsAny": ["Philippines"] }
```

```json
{ "field": "curraddrCountry", "notEqualsAny": ["Philippines"] }
```

The package exposes one condition evaluator. Package validation, fixture
generation, the Next.js renderer, and the Playwright driver use that evaluator
instead of maintaining separate condition logic.

The canonical JSON schema and runtime Zod schema reject conditions containing
both operators or neither operator.

### Address fields

The canonical definition adds the foreign-address fields using the UAT names,
labels, and `textarea` type. Applicant fields need only the country condition.
Parent and guardian fields use an AND array combining their existing
Living/Others condition with the corresponding country condition.

Existing Philippine sub-fields also gain the complete combined conditions for
parent and guardian addresses. This ensures switching to Angola hides the
Philippine controls rather than merely adding another required field.

Hidden branch values are cleared by the existing Next.js conditional-field
behavior and rejected by package validation. Switching back to `Philippines`
restores the existing Philippine field branch.

### Data flow

The Next.js editor renders the new contract fields and saves their values in
the existing profile JSON document. No new persistence column, DTO, endpoint,
or Hono payload is needed.

The Hono runner already writes the selected profile JSON to the Playwright data
file unchanged. The Playwright driver already fills `textarea` controls through
its generic text-like path. It only needs to use the shared condition evaluator
so it skips the hidden Philippine branch and fills the visible `*Foreign`
field.

The manual generated E2E fixture uses `Angola` for active address-country
fields and a harmless non-empty foreign-address value. Automated runs using a
saved profile continue to use that profile's selected countries and values.

### Validation and failure behavior

- A visible foreign-address textarea is required and rejects an empty value.
- A populated foreign address is rejected when its country is `Philippines`.
- Populated Philippine sub-fields are rejected when their country is not
  `Philippines`.
- Hidden parent or guardian address branches remain optional and do not block
  step validation.
- Invalid compound conditions fail while parsing the shared definition rather
  than producing consumer-specific behavior.

### Verification

Automated coverage will verify:

- parsing and evaluation of legacy single conditions, AND arrays,
  `equalsAny`, and `notEqualsAny`;
- rejection of malformed condition operators;
- package validation for Philippine and Angola address branches;
- all applicant, parent, guardian, and microcredentials foreign-address fields;
- parent Living and guardian Others compound visibility;
- Next.js rendering, required errors, country switching, and stale-value
  clearing;
- preservation of the existing Philippine controls;
- Angola fixture generation with foreign-address values;
- Playwright skipping hidden Philippine controls and filling the UAT textarea;
- unchanged Hono profile-data forwarding.

The live E2E suite will submit one international-path application rather than
duplicating live submissions solely for Philippine regression coverage.

## Non-goals

- Structured international address parsing or validation.
- Country-specific international address formats.
- Geocoding, address lookup, or autocomplete.
- New database columns or Hono payload transformations.
- A second live UAT submission only to retest the Philippine branch.

## Approved decisions

- Use Angola for the generated international E2E path.
- Foreign addresses are required textareas matching the UAT controls.
- All address groups are covered.
- Philippine behavior remains unchanged and receives regression coverage.
- Compound and negative visibility rules belong in the shared package.
- Consumers reuse one package evaluator.
- No new dependency or consumer-specific address mapping is introduced.
