# International Address E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the shared EnrollMate contract, Next.js profile editor, and Playwright runner represent and complete every required UAT foreign-address field when an address country is not the Philippines.

**Architecture:** Extend the shared contract with normalized AND visibility rules and a negative condition operator, then make every consumer call one shared evaluator. Add the UAT `*Foreign` textareas to the canonical definition, keep the dashboard/Hono JSON pass-through unchanged, and make the manually generated live E2E fixture choose Angola.

**Tech Stack:** TypeScript, Zod 4, JSON Schema 2020-12, React 19, TanStack Form, Vitest, Node test runner, Playwright.

---

## File map

### Create

- `packages/enrollmate-contract/src/condition.ts` — one evaluator for normalized visibility conditions.
- `playwright/server/__tests__/unit/apply-now-driver.test.ts` — focused proof that the driver skips Philippine controls and fills the foreign textarea.

### Modify

- `packages/enrollmate-contract/src/types.ts` — exclusive positive/negative rule types and normalized condition arrays.
- `packages/enrollmate-contract/src/form-definition.schema.ts` — parse legacy single rules or AND arrays, normalize to arrays, and validate all references.
- `packages/enrollmate-contract/src/form-data.schema.ts` — use the shared evaluator for required/hidden validation.
- `packages/enrollmate-contract/src/testing.ts` — use the shared evaluator when generating fixtures.
- `packages/enrollmate-contract/src/index.ts` — export the evaluator and condition types.
- `packages/enrollmate-contract/src/definitions/enrollmate-form-definition.schema.json` — mirror the runtime visibility grammar.
- `packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json` — add all UAT foreign fields and correct every Philippine/foreign branch.
- `packages/enrollmate-contract/README.md` — document the visibility API and foreign-address contract.
- `nextjs/feature/e2e/utils/e2e-profile-form.util.ts` — delegate visibility to the package evaluator.
- `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts` — cover parsing, normalization, operators, references, and foreign fields.
- `nextjs/__tests__/unit/lib/enrollmate-fixture.test.ts` — cover Philippine and Angola fixture branches.
- `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts` — cover switching branches and clearing stale values.
- `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx` — adapt normalized-condition helpers and assert textarea rendering.
- `playwright/lib/enrollmate/apply-now-driver.ts` — use the package evaluator instead of its local one-rule check.
- `playwright/lib/enrollmate/value-resolver.ts` — generate Angola and foreign-address values for manual live runs.
- `playwright/tests/e2e/enrollmate/apply-now.spec.ts` — activate all applicable bachelors address groups in generated runs.
- `playwright/server/__tests__/unit/enrollmate-contract.test.ts` — adapt legacy condition helpers and verify the Angola fixture.

### Intentionally unchanged

- `playwright/server/runner/run-e2e.ts` — already writes the complete saved profile JSON to the child suite without filtering or reshaping it.
- Next.js persistence schema, serializers, services, and actions — the form payload is already a contract-driven JSON document.
- `nextjs/lib/drizzle/seed/profile/profile-form-value-policy.ts` — keep Philippine seed data as the regression/default editor path.

---

### Task 0: Commit the approved implementation plan

**Files:**

- Add: `docs/plans/2026-07-26-international-address-e2e.md`

- [ ] **Step 1: Commit the plan before implementation changes**

```powershell
git add docs/plans/2026-07-26-international-address-e2e.md
git commit -m "docs(e2e): plan international address support"
```

Expected: the worktree is clean before Task 1 begins.

---

### Task 1: Add one shared compound-condition engine

**Files:**

- Create: `packages/enrollmate-contract/src/condition.ts`
- Modify: `packages/enrollmate-contract/src/types.ts`
- Modify: `packages/enrollmate-contract/src/form-definition.schema.ts`
- Modify: `packages/enrollmate-contract/src/form-data.schema.ts`
- Modify: `packages/enrollmate-contract/src/testing.ts`
- Modify: `packages/enrollmate-contract/src/index.ts`
- Modify: `packages/enrollmate-contract/src/definitions/enrollmate-form-definition.schema.json`
- Modify: `packages/enrollmate-contract/README.md`
- Modify: `nextjs/feature/e2e/utils/e2e-profile-form.util.ts`
- Modify: `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts`
- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx`
- Modify: `playwright/lib/enrollmate/apply-now-driver.ts`
- Modify: `playwright/server/__tests__/unit/enrollmate-contract.test.ts`

- [ ] **Step 1: Add failing condition grammar and evaluator tests**

In `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts`, import
`isEnrollmateConditionMet` plus `type EnrollmateCondition` and add:

```ts
it("evaluates normalized AND and negative visibility conditions", () => {
  const condition: EnrollmateCondition = [
    { field: "fthrDeceased", equalsAny: ["Living"] },
    { field: "fthrCurraddrCountry", notEqualsAny: ["Philippines"] },
  ];

  expect(
    isEnrollmateConditionMet(condition, {
      fthrDeceased: "Living",
      fthrCurraddrCountry: "Angola",
    }),
  ).toBe(true);
  expect(
    isEnrollmateConditionMet(condition, {
      fthrDeceased: "Living",
      fthrCurraddrCountry: "Philippines",
    }),
  ).toBe(false);
  expect(
    isEnrollmateConditionMet(condition, {
      fthrDeceased: "Deceased",
      fthrCurraddrCountry: "Angola",
    }),
  ).toBe(false);
});

it("rejects malformed visibility operators", () => {
  const both = JSON.parse(JSON.stringify(source));
  both.flows.bachelors.steps[0].sections
    .flatMap((section: { fields: Array<{ name: string }> }) => section.fields)
    .find((field: { name: string }) => field.name === "curraddrAddrline1")
    .visibleWhen = {
      field: "curraddrCountry",
      equalsAny: ["Philippines"],
      notEqualsAny: ["Philippines"],
    };

  const neither = JSON.parse(JSON.stringify(source));
  neither.flows.bachelors.steps[0].sections
    .flatMap((section: { fields: Array<{ name: string }> }) => section.fields)
    .find((field: { name: string }) => field.name === "curraddrAddrline1")
    .visibleWhen = { field: "curraddrCountry" };

  expect(() => parseEnrollmateDefinitionSource(both)).toThrow();
  expect(() => parseEnrollmateDefinitionSource(neither)).toThrow();
});
```

Update the existing unknown-condition-reference case so it treats
`visibleWhen` as either one rule or an array and changes the first rule's
`field`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
Set-Location nextjs
pnpm vitest run __tests__/unit/lib/enrollmate-contract.test.ts
```

Expected: FAIL because `isEnrollmateConditionMet`, `notEqualsAny`, and condition
arrays are not supported.

- [ ] **Step 3: Define the normalized condition types and evaluator**

In `packages/enrollmate-contract/src/types.ts`, replace the one-shape rule with:

```ts
export type EnrollmateEqualsCondition = {
  field: string;
  equalsAny: EnrollmateConditionValue[];
  notEqualsAny?: never;
};

export type EnrollmateNotEqualsCondition = {
  field: string;
  equalsAny?: never;
  notEqualsAny: EnrollmateConditionValue[];
};

export type EnrollmateConditionalRule =
  | EnrollmateEqualsCondition
  | EnrollmateNotEqualsCondition;

export type EnrollmateCondition = EnrollmateConditionalRule[];
```

Change `EnrollmateField.conditionalOn` to:

```ts
conditionalOn: EnrollmateCondition | null;
```

Create `packages/enrollmate-contract/src/condition.ts`:

```ts
import type {
  EnrollmateConditionalRule,
  EnrollmateConditionValue,
} from "./types";

function isConditionValue(value: unknown): value is EnrollmateConditionValue {
  return typeof value === "string" || typeof value === "boolean";
}

export function isEnrollmateConditionMet(
  condition: readonly EnrollmateConditionalRule[] | null,
  values: Record<string, unknown>,
) {
  if (!condition) return true;

  return condition.every((rule) => {
    const value = values[rule.field];
    if (!isConditionValue(value)) return false;
    if ("equalsAny" in rule) return rule.equalsAny.includes(value);
    return !rule.notEqualsAny.includes(value);
  });
}
```

- [ ] **Step 4: Parse legacy rules and arrays, then normalize**

In `packages/enrollmate-contract/src/form-definition.schema.ts`, define two
strict rule schemas and accept one rule or a non-empty array:

```ts
const equalsConditionSchema = z.object({
  field: z.string().min(1),
  equalsAny: z.array(conditionValueSchema).min(1),
}).strict();

const notEqualsConditionSchema = z.object({
  field: z.string().min(1),
  notEqualsAny: z.array(conditionValueSchema).min(1),
}).strict();

const conditionalRuleSchema = z.union([
  equalsConditionSchema,
  notEqualsConditionSchema,
]);

const visibleWhenSchema = z.union([
  conditionalRuleSchema,
  z.array(conditionalRuleSchema).min(1),
]);
```

Normalize in `normalizeField`:

```ts
conditionalOn: field.visibleWhen
  ? Array.isArray(field.visibleWhen)
    ? field.visibleWhen
    : [field.visibleWhen]
  : null,
```

Flatten every normalized rule in `getFieldReferences`:

```ts
...(field.conditionalOn ?? []).map((condition) => condition.field),
```

Keep `schemaVersion: 1`; the checked-in JSON source remains backward compatible.

Update the existing unknown-condition-reference test with:

```ts
const conditionalField = unknownCondition.flows.bachelors.steps[0].sections
  .flatMap(
    (section: {
      fields: Array<{
        name: string;
        visibleWhen?: { field: string } | Array<{ field: string }>;
      }>;
    }) => section.fields,
  )
  .find((field: { name: string }) => field.name === "lastschOther");
if (!conditionalField?.visibleWhen) {
  throw new Error("Expected lastschOther visibility condition");
}
const conditions = Array.isArray(conditionalField.visibleWhen)
  ? conditionalField.visibleWhen
  : [conditionalField.visibleWhen];
conditions[0]!.field = "missingField";
```

In `packages/enrollmate-contract/src/definitions/enrollmate-form-definition.schema.json`,
split the definition into `conditionalRule` and `visibleWhen`. Use `oneOf` for
the exclusive operator objects and accept either one rule or a non-empty array:

```json
"conditionalRule": {
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "required": ["field", "equalsAny"],
      "properties": {
        "field": { "type": "string", "minLength": 1 },
        "equalsAny": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/conditionValue" }
        }
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "required": ["field", "notEqualsAny"],
      "properties": {
        "field": { "type": "string", "minLength": 1 },
        "notEqualsAny": {
          "type": "array",
          "minItems": 1,
          "items": { "$ref": "#/$defs/conditionValue" }
        }
      }
    }
  ]
},
"visibleWhen": {
  "oneOf": [
    { "$ref": "#/$defs/conditionalRule" },
    {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/conditionalRule" }
    }
  ]
}
```

- [ ] **Step 5: Replace all local condition evaluators**

Export `isEnrollmateConditionMet` and the new condition types from
`packages/enrollmate-contract/src/index.ts`.

In `form-data.schema.ts`, import directly from `./condition` and call:

```ts
const isVisible = isEnrollmateConditionMet(field.conditionalOn, data);
```

Use generic compound-safe messages:

```ts
message: `${field.label} is required for the selected values.`,
message: `${field.label} is not available for the selected values.`,
```

In `testing.ts`, import directly from `./condition`, delete
`conditionMatches`, and call:

```ts
isEnrollmateConditionMet(field.conditionalOn, data)
```

In `nextjs/feature/e2e/utils/e2e-profile-form.util.ts`, replace the local body:

```ts
export function isEnrollmateFieldVisible(
  field: EnrollmateField,
  values: Record<string, unknown>,
): boolean {
  return isEnrollmateConditionMet(field.conditionalOn, values);
}
```

In `playwright/lib/enrollmate/apply-now-driver.ts`, replace the complete
`field.conditionalOn` branch with:

```ts
if (!isEnrollmateConditionMet(field.conditionalOn, data)) continue;
```

Do not add a second Playwright-specific helper.

- [ ] **Step 6: Adapt existing tests to normalized arrays**

In the renderer test, replace `getVisibilityValues` with a helper that satisfies
every normalized rule:

```ts
function getVisibilityValues(field: EnrollmateField) {
  return Object.fromEntries(
    (field.conditionalOn ?? []).map((condition) => [
      condition.field,
      "equalsAny" in condition
        ? condition.equalsAny[0]
        : "__not_excluded__",
    ]),
  );
}
```

Use that helper in the exhaustive field-type test. In the hidden-section test,
start from `getVisibilityValues(hiddenField)`, then make the first rule fail:

```ts
const hiddenValues = getVisibilityValues(hiddenField);
const firstCondition = hiddenField.conditionalOn?.[0];
if (!firstCondition) throw new Error("Expected a conditional field");
hiddenValues[firstCondition.field] =
  "equalsAny" in firstCondition
    ? "__not_in_equals_any__"
    : firstCondition.notEqualsAny[0];
```

In the Playwright contract helper `getConditionalFieldCase`, explicitly skip
compound and negative cases so the existing legacy-condition test remains
focused:

```ts
const conditions = field.conditionalOn;
if (
  conditions?.length !== 1 ||
  !("equalsAny" in conditions[0]) ||
  !field.requiredWhenConditionMet
) {
  continue;
}
const condition = conditions[0];
```

This updates these exact accesses:

- `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx`
  helper `getVisibilityValues`, exhaustive field-type test, and hidden section
  test.
- `playwright/server/__tests__/unit/enrollmate-contract.test.ts`
  helper `getConditionalFieldCase`.

- [ ] **Step 7: Document the public condition contract**

In `packages/enrollmate-contract/README.md`, add the public evaluator:

```ts
import { isEnrollmateConditionMet } from "@mihc/enrollmate-contract";

const visible = isEnrollmateConditionMet(field.conditionalOn, values);
```

Document that source JSON may use one rule or an AND array and that a rule has
exactly one of `equalsAny` or `notEqualsAny`.

- [ ] **Step 8: Run focused tests and typechecks**

Run:

```powershell
Set-Location nextjs
pnpm vitest run __tests__/unit/lib/enrollmate-contract.test.ts __tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx
pnpm tsc --noEmit

Set-Location ..\playwright
pnpm test:unit
pnpm typecheck
```

Expected: all commands PASS.

- [ ] **Step 9: Commit**

```powershell
git add packages/enrollmate-contract nextjs/feature/e2e/utils/e2e-profile-form.util.ts nextjs/__tests__/unit/lib/enrollmate-contract.test.ts nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx playwright/lib/enrollmate/apply-now-driver.ts playwright/server/__tests__/unit/enrollmate-contract.test.ts
git commit -m "feat(enrollmate): support compound visibility rules"
```

---

### Task 2: Add every UAT foreign-address branch

**Files:**

- Modify: `packages/enrollmate-contract/src/form-definition.schema.ts`
- Modify: `packages/enrollmate-contract/src/definitions/enrollmate-form-fields.json`
- Modify: `packages/enrollmate-contract/README.md`
- Modify: `nextjs/feature/e2e/utils/e2e-profile-form.util.ts`
- Modify: `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts`
- Modify: `nextjs/__tests__/unit/lib/enrollmate-fixture.test.ts`
- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts`
- Modify: `nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx`

- [ ] **Step 1: Add failing contract and validation tests**

In `nextjs/__tests__/unit/lib/enrollmate-contract.test.ts`, add this helper:

```ts
function getField(
  flowType: "bachelors" | "microcredentials",
  fieldName: string,
) {
  const field = getEnrollmateFlowDefinition(flowType).steps
    .flatMap((step) => step.sections)
    .flatMap((section) => section.fields)
    .find((candidate) => candidate.name === fieldName);

  if (!field) throw new Error(`Missing ${flowType} field: ${fieldName}`);
  return field;
}
```

Then assert all exact foreign field names:

```ts
for (const name of [
  "curraddrForeign",
  "permaddrForeign",
  "fthrCurraddrForeign",
  "fthrPermaddrForeign",
  "mthrCurraddrForeign",
  "mthrPermaddrForeign",
  "grdnCurraddrForeign",
  "grdnPermaddrForeign",
]) {
  expect(getField("bachelors", name)).toMatchObject({
    type: "textarea",
    conditionalOn: expect.any(Array),
  });
}
expect(getField("microcredentials", "curraddrForeign")).toMatchObject({
  type: "textarea",
  required: true,
});
```

In `nextjs/__tests__/unit/lib/enrollmate-fixture.test.ts`, add validator
assertions built from actual fixtures:

```ts
const philippine = createEnrollmateFixture("bachelors", {
  overrides: { curraddrCountry: "Philippines" },
  resolveField: resolveFixtureField,
});
expect(getEnrollmateValidator("bachelors").safeParse(philippine).success).toBe(true);
expect(philippine).toHaveProperty("curraddrAddrline1");
expect(philippine).not.toHaveProperty("curraddrForeign");

const angola = createEnrollmateFixture("bachelors", {
  overrides: {
    curraddrCountry: "Angola",
    curraddrForeign: "123 Avenida Principal, Luanda",
  },
  resolveField: resolveFixtureField,
});
expect(getEnrollmateValidator("bachelors").safeParse(angola).success).toBe(true);
expect(angola).toHaveProperty("curraddrForeign");
expect(angola).not.toHaveProperty("curraddrAddrline1");

const missingForeign = { ...angola };
delete missingForeign.curraddrForeign;
expect(
  getEnrollmateValidator("bachelors").safeParse(missingForeign).success,
).toBe(false);
expect(
  getEnrollmateValidator("bachelors").safeParse({
    ...angola,
    curraddrAddrline1: "must be rejected",
  }).success,
).toBe(false);
expect(
  getEnrollmateValidator("bachelors").safeParse({
    ...philippine,
    curraddrForeign: "must be rejected",
  }).success,
).toBe(false);
```

- [ ] **Step 2: Add failing Next.js branch-switch tests**

In `profile-form-definition.test.ts`, add a test using actual contract fields:

```ts
it("switches between Philippine and foreign address branches", () => {
  const currentForeign = getBachelorsField("curraddrForeign");
  const currentLine1 = getBachelorsField("curraddrAddrline1");
  const angola = {
    curraddrCountry: "Angola",
    curraddrForeign: "123 Avenida Principal, Luanda",
    curraddrAddrline1: "stale Philippine value",
  };

  expect(isEnrollmateFieldVisible(currentForeign, angola)).toBe(true);
  expect(isEnrollmateFieldVisible(currentLine1, angola)).toBe(false);
  expect(clearUnavailableE2eProfileFormValues(bachelors, angola)).toEqual({
    curraddrCountry: "Angola",
    curraddrForeign: "123 Avenida Principal, Luanda",
  });
  expect(isEnrollmateFieldRendered(currentForeign, angola)).toBe(true);
  expect(isEnrollmateFieldRendered(currentLine1, angola)).toBe(false);

  expect(
    clearUnavailableE2eProfileFormValues(bachelors, {
      curraddrCountry: "Philippines",
      curraddrForeign: "stale foreign value",
      curraddrAddrline1: "123",
    }),
  ).not.toHaveProperty("curraddrForeign");
});
```

Add a parent/guardian assertion with both controllers:

```ts
expect(
  isEnrollmateFieldVisible(getBachelorsField("fthrCurraddrForeign"), {
    fthrDeceased: "Living",
    fthrCurraddrCountry: "Angola",
  }),
).toBe(true);
expect(
  isEnrollmateFieldVisible(getBachelorsField("grdnCurraddrForeign"), {
    guardian: "Father",
    grdnCurraddrCountry: "Angola",
  }),
).toBe(false);

const fatherForeign = getBachelorsField("fthrCurraddrForeign");
const fatherLine1 = getBachelorsField("fthrCurraddrAddrline1");
expect(
  isEnrollmateFieldRendered(fatherForeign, {
    fthrDeceased: "Living",
    fthrCurraddrCountry: "Angola",
  }),
).toBe(true);
expect(
  isEnrollmateFieldRendered(fatherLine1, {
    fthrDeceased: "Living",
    fthrCurraddrCountry: "Angola",
  }),
).toBe(false);
expect(
  isEnrollmateFieldRendered(fatherLine1, {
    fthrDeceased: "Deceased",
    fthrCurraddrCountry: "",
  }),
).toBe(true);
```

In `enrollmate-field-renderer.test.tsx`, render `curraddrForeign` with Angola
values and assert:

```ts
const definition = getField("curraddrForeign");
render(
  <RendererHarness
    definition={definition}
    initialValue=""
    values={{ curraddrCountry: "Angola" }}
  />,
);

expect(
  screen.getByRole("textbox", { name: "Current Foreign Address" }),
).toHaveAttribute("aria-required", "true");
```

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```powershell
Set-Location nextjs
pnpm vitest run __tests__/unit/lib/enrollmate-contract.test.ts __tests__/unit/lib/enrollmate-fixture.test.ts __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts __tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx
```

Expected: FAIL because the canonical definition has no `*Foreign` fields.

- [ ] **Step 4: Make parent rendering honor country branches while Living**

In `nextjs/feature/e2e/utils/e2e-profile-form.util.ts`, replace the
unconditional parent rendering exception:

```ts
export function isEnrollmateFieldRendered(
  field: EnrollmateField,
  values: Record<string, unknown>,
) {
  if (isEnrollmateSpecifyGuardianRelationshipField(field)) {
    return values.guardian === "Others";
  }
  if (
    isEnrollmateParentField(field) &&
    isEnrollmateParentFieldDisabled(field, values)
  ) {
    return true;
  }

  return (
    isEnrollmateLastSchoolAttendedField(field) ||
    isEnrollmateFieldVisible(field, values)
  );
}
```

This keeps every non-living parent field rendered and disabled. For a Living
parent, the compound condition chooses only the Philippine or foreign branch.

- [ ] **Step 5: Permit textarea in the address template**

In `packages/enrollmate-contract/src/form-definition.schema.ts`, change:

```ts
type: z.enum(["text", "textarea", "select"]),
```

In the JSON schema's `addressFieldTemplate` type enum, add `"textarea"` beside
`"text"` and `"select"`. No other address-template schema extension is needed.

- [ ] **Step 6: Update canonical metadata and template**

In `enrollmate-form-fields.json`:

- set metadata version to `1.10.0`;
- set `referenceDate` to `2026-07-26`;
- keep the source URL at the flow-neutral `/apply-now` entry point;
- replace the address source note with:
  `Philippine address sub-fields are conditional on Country = Philippines; one required Foreign textarea is conditional on Country != Philippines`;
- add a source note:
  `Foreign textarea names and labels verified on the live UAT bachelors-degree route on 2026-07-26`;
- add this template field:

```json
{
  "name": "{prefix}Foreign",
  "type": "textarea",
  "required": true,
  "label": "Foreign Address"
}
```

- [ ] **Step 7: Add the nine exact foreign fields**

Insert applicant and microcredentials foreign fields immediately after their
country field. Insert father, mother, and guardian foreign fields immediately
after the existing copy-address checkbox for the matching current/permanent
group, preserving the current source order.
Use this exhaustive mapping:

| Flow | Name/id | Label | Conditions |
|---|---|---|---|
| bachelors | `curraddrForeign` | Current Foreign Address | `curraddrCountry notEqualsAny Philippines` |
| bachelors | `permaddrForeign` | Permanent Foreign Address | `permaddrCountry notEqualsAny Philippines` |
| bachelors | `fthrCurraddrForeign` | Father Current Foreign Address | `fthrDeceased equalsAny Living` AND `fthrCurraddrCountry notEqualsAny Philippines` |
| bachelors | `fthrPermaddrForeign` | Father Permanent Foreign Address | `fthrDeceased equalsAny Living` AND `fthrPermaddrCountry notEqualsAny Philippines` |
| bachelors | `mthrCurraddrForeign` | Mother Current Foreign Address | `mthrDeceased equalsAny Living` AND `mthrCurraddrCountry notEqualsAny Philippines` |
| bachelors | `mthrPermaddrForeign` | Mother Permanent Foreign Address | `mthrDeceased equalsAny Living` AND `mthrPermaddrCountry notEqualsAny Philippines` |
| bachelors | `grdnCurraddrForeign` | Guardian Current Foreign Address | `guardian equalsAny Others` AND `grdnCurraddrCountry notEqualsAny Philippines` |
| bachelors | `grdnPermaddrForeign` | Guardian Permanent Foreign Address | `guardian equalsAny Others` AND `grdnPermaddrCountry notEqualsAny Philippines` |
| microcredentials | `curraddrForeign` | Current Foreign Address | `curraddrCountry notEqualsAny Philippines` |

Applicant, father, mother, and microcredentials entries use `required: true`.
Guardian entries follow the existing guardian contract with `required: false`
and `requiredWhenVisible: true`.

The exact applicant-current entry is:

```json
{
  "id": "curraddrForeign",
  "name": "curraddrForeign",
  "label": "Current Foreign Address",
  "type": "textarea",
  "required": true,
  "visibleWhen": {
    "field": "curraddrCountry",
    "notEqualsAny": ["Philippines"]
  }
}
```

The exact father-current compound entry is:

```json
{
  "id": "fthrCurraddrForeign",
  "name": "fthrCurraddrForeign",
  "label": "Father Current Foreign Address",
  "type": "textarea",
  "required": true,
  "visibleWhen": [
    {
      "field": "fthrDeceased",
      "equalsAny": ["Living"]
    },
    {
      "field": "fthrCurraddrCountry",
      "notEqualsAny": ["Philippines"]
    }
  ]
}
```

Use the exhaustive mapping table above to substitute the other exact names,
labels, controllers, and country fields. Guardian entries additionally replace
`"required": true` with:

```json
"required": false,
"requiredWhenVisible": true
```

- [ ] **Step 8: Correct every Philippine branch**

Applicant and microcredentials Philippine fields already have the correct
single country condition. For parent and guardian addresses, replace the
existing one-rule `visibleWhen` on every `Addrline1`, `Addrline2`, `Province`,
`Citymun`, `Barangay`, and `Zipcode` field with these exact AND pairs:

| Prefixes | First rule | Second rule |
|---|---|---|
| `fthrCurraddr`, `fthrPermaddr` | `fthrDeceased equalsAny Living` | matching `*Country equalsAny Philippines` |
| `mthrCurraddr`, `mthrPermaddr` | `mthrDeceased equalsAny Living` | matching `*Country equalsAny Philippines` |
| `grdnCurraddr`, `grdnPermaddr` | `guardian equalsAny Others` | matching `*Country equalsAny Philippines` |

For example, every `fthrCurraddr*` Philippine sub-field uses:

```json
"visibleWhen": [
  {
    "field": "fthrDeceased",
    "equalsAny": ["Living"]
  },
  {
    "field": "fthrCurraddrCountry",
    "equalsAny": ["Philippines"]
  }
]
```

Apply the exhaustive prefix/controller table above to the other five prefixes;
do not infer controllers from field names.

Do not alter country controls, copy-address checkboxes, cascade definitions,
option sources, or Philippine labels.

- [ ] **Step 9: Document the address branch**

In `packages/enrollmate-contract/README.md`, state that `*Foreign` fields match
the UAT DOM names and are mutually exclusive with the Philippine sub-fields.

- [ ] **Step 10: Run focused tests and typecheck**

Run:

```powershell
Set-Location nextjs
pnpm vitest run __tests__/unit/lib/enrollmate-contract.test.ts __tests__/unit/lib/enrollmate-fixture.test.ts __tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts __tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx
pnpm tsc --noEmit
```

Expected: PASS.

- [ ] **Step 11: Commit**

```powershell
git add packages/enrollmate-contract nextjs/feature/e2e/utils/e2e-profile-form.util.ts nextjs/__tests__/unit/lib/enrollmate-contract.test.ts nextjs/__tests__/unit/lib/enrollmate-fixture.test.ts nextjs/__tests__/unit/feature/e2e/profile-form/profile-form-definition.test.ts nextjs/__tests__/unit/feature/e2e/profile-form/enrollmate-field-renderer.test.tsx
git commit -m "feat(enrollmate): add foreign address fields"
```

---

### Task 3: Exercise Angola through Playwright

**Files:**

- Modify: `playwright/lib/enrollmate/value-resolver.ts`
- Modify: `playwright/tests/e2e/enrollmate/apply-now.spec.ts`
- Modify: `playwright/server/__tests__/unit/enrollmate-contract.test.ts`
- Create: `playwright/server/__tests__/unit/apply-now-driver.test.ts`

- [ ] **Step 1: Add a failing generated-fixture test**

Import `createEnrollmateValueResolver` in
`playwright/server/__tests__/unit/enrollmate-contract.test.ts` and add:

```ts
test("generates an Angola fixture with foreign address branches", () => {
  const data = createEnrollmateFixture("bachelors", {
    overrides: {
      fthrDeceased: "Living",
      mthrDeceased: "Living",
      guardian: "Others",
    },
    resolveField: createEnrollmateValueResolver("applicant@example.edu"),
  });

  for (const prefix of [
    "curraddr",
    "permaddr",
    "fthrCurraddr",
    "fthrPermaddr",
    "mthrCurraddr",
    "mthrPermaddr",
    "grdnCurraddr",
    "grdnPermaddr",
  ]) {
    assert.equal(data[`${prefix}Country`], "Angola");
    assert.equal(typeof data[`${prefix}Foreign`], "string");
    assert.notEqual(data[`${prefix}Foreign`], "");
    assert.equal(data[`${prefix}Addrline1`], undefined);
  }
});
```

- [ ] **Step 2: Add a failing driver selection test**

Create `apply-now-driver.test.ts` using actual contract fields and one minimal
locator:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Page } from "@playwright/test";
import { getEnrollmateFlowDefinition } from "@mihc/enrollmate-contract";

import { fillStep } from "../../../lib/enrollmate/apply-now-driver";

test("fills the visible foreign textarea and skips Philippine controls", async () => {
  const fields = getEnrollmateFlowDefinition("bachelors").steps[0]!.sections
    .flatMap((section) => section.fields);
  const foreign = fields.find((field) => field.name === "curraddrForeign")!;
  const line1 = fields.find((field) => field.name === "curraddrAddrline1")!;
  const filled: string[] = [];
  const locator = {
    count: async () => 1,
    fill: async (value: string) => {
      filled.push(value);
    },
    scrollIntoViewIfNeeded: async () => undefined,
  };
  const page = {
    locator: (selector: string) => {
      assert.equal(selector, '[name="curraddrForeign"]');
      return locator;
    },
  } as unknown as Page;

  const outcome = await fillStep(
    page,
    {
      step: 1,
      title: "Address",
      sections: [{ label: "Current Address", fields: [line1, foreign] }],
    },
    {
      curraddrCountry: "Angola",
      curraddrAddrline1: "must not be filled",
      curraddrForeign: "123 Avenida Principal, Luanda",
    },
  );

  assert.deepEqual(outcome, { ok: true });
  assert.deepEqual(filled, ["123 Avenida Principal, Luanda"]);
});
```

The strict selector assertion makes the test fail if the hidden Philippine
field reaches locator resolution.

- [ ] **Step 3: Run Playwright unit tests and verify they fail**

Run:

```powershell
Set-Location playwright
pnpm test:unit
```

Expected: the fixture test FAILS because countries resolve to Philippines; the
driver test passes only if Task 1 correctly adopted the shared evaluator.

- [ ] **Step 4: Generate Angola and explicit foreign values**

In `playwright/lib/enrollmate/value-resolver.ts`, change only address policy:

```ts
if (name.includes("country")) return "Angola";
if (name.endsWith("foreign")) return "123 Avenida Principal, Luanda";
```

Leave Philippine province/city/barangay/address-line resolvers in place. They
remain harmless fallbacks and preserve the resolver's ability to support a
future Philippines override; the condition-aware fixture builder will not call
them for the Angola branch.

- [ ] **Step 5: Activate parent and guardian groups in generated bachelors runs**

In the no-profile-data branch of `apply-now.spec.ts`, extend bachelors
overrides:

```ts
const overrides: Record<string, unknown> =
  flowType === "bachelors"
    ? {
        email,
        schoolNotFound: true,
        lastSchoolAttended: "Rizal National High School",
        fthrDeceased: "Living",
        mthrDeceased: "Living",
        guardian: "Others",
      }
    : { email };
```

Do not overwrite country or foreign-address values when
`E2E_PROFILE_DATA_FILE` is set. Automated Hono runs must preserve the selected
profile exactly.

- [ ] **Step 6: Run Playwright unit tests and typecheck**

Run:

```powershell
Set-Location playwright
pnpm test:unit
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add playwright/lib/enrollmate/value-resolver.ts playwright/tests/e2e/enrollmate/apply-now.spec.ts playwright/server/__tests__/unit/enrollmate-contract.test.ts playwright/server/__tests__/unit/apply-now-driver.test.ts
git commit -m "fix(e2e): fill foreign address fields"
```

---

### Task 4: Run the complete non-destructive verification

**Files:**

- Verify only; no source changes expected.

- [ ] **Step 1: Run all Next.js tests**

```powershell
just dev-test
```

Expected: PASS.

- [ ] **Step 2: Run Next.js lint and typecheck**

```powershell
just lint
just typecheck
```

Expected: PASS.

- [ ] **Step 3: Run Playwright server tests and typecheck**

```powershell
just test-playwright-unit
Set-Location playwright
pnpm typecheck
Set-Location ..
```

Expected: PASS.

- [ ] **Step 4: Verify the contract and diff**

```powershell
git diff --check
git status --short
git diff HEAD~3 -- playwright/server/runner/run-e2e.ts
```

Expected:

- `git diff --check` prints nothing;
- status contains no uncommitted implementation files;
- `run-e2e.ts` has no diff, confirming Hono still forwards the full profile
  JSON unchanged.

- [ ] **Step 5: Request confirmation before the live UAT run**

`just test-playwright-e2e` submits real applications to UAT. Ask the user for
action-time confirmation before running it.

If approved, run:

```powershell
just test-playwright-e2e
```

Expected: both configured flows complete without a missing foreign-address
validation error. Record the result; do not retry submissions automatically.

If approval is not given, report the live submission test as intentionally not
run and hand off this exact manual verification:

1. Open the Next.js E2E profile editor.
2. Set applicable address countries to Angola.
3. Confirm only each `* Foreign Address` textarea appears.
4. Enter a non-empty value and save/finalize the profile.
5. Run that profile once and confirm every wizard step advances.
