# `@mihc/enrollmate-contract`

The shared, versioned EnrollMate form-definition contract. This package is the
single source of truth for the checked-in form definition used by the Next.js
application and server-side Playwright tooling.

## Source of truth

```text
src/definitions/enrollmate-form-fields.json
src/definitions/enrollmate-form-definition.schema.json
```

The JSON document is validated strictly by Zod when the registry loads. It
contains both flow definitions, reusable option sets, field conditions,
dependent/cascade metadata, upload limits, and automation examples. Do not
duplicate its options in `nextjs/` or `playwright/`.

## Public API

```ts
import {
  getEnrollmateFlowDefinition,
  getEnrollmateReusableOptionSets,
  getEnrollmateValidator,
} from "@mihc/enrollmate-contract";
```

### `getEnrollmateFlowDefinition(flowType)`

Returns the ordered normalized definition for `bachelors` or
`microcredentials`. Choice fields expose their resolved `options` and
`optionsByDependency` values, so a renderer or test generator can use the
flow directly.

### `getEnrollmateReusableOptionSets()`

Returns every named reusable option set:

```ts
const optionSets = getEnrollmateReusableOptionSets();
const countries = optionSets.countryOptions;
```

The record is dynamic: adding a validated set name to the source JSON does not
require a TypeScript schema change. Each call returns a fresh record, arrays,
and option objects, so consumers cannot mutate the registry’s source data.

### `getEnrollmateValidator(flowType)`

Returns the Zod validator for submitted flow data. It enforces field types,
captured choice values, conditional visibility/requirements, dependent options,
and file extension/size rules.

### Server-only API

```ts
import { getEnrollmateDefinitionHash } from "@mihc/enrollmate-contract/server";
```

The `./server` entry point uses Node crypto to hash the exact source document
and must not be imported into browser code. The package root is the shared
consumer API.

## Consumers

Next.js declares the package in `nextjs/package.json` and transpiles it through
`nextjs/next.config.ts`. Playwright declares the same local file dependency in
`playwright/package.json`; server-only unit tests live under
`playwright/server/__tests__/unit/` and do not run through the browser suite.

## Updating the definition

1. Update the canonical JSON and keep its `$schema` reference valid.
2. Preserve stable field names and IDs used by profile data and selectors.
3. Use explicit option-source, condition, cascade, upload, and automation
   properties; do not add undocumented keys.
4. Run the Next.js contract tests and typecheck.
5. Run Playwright server unit tests and typecheck.
6. Update the relevant design/plan documentation under `docs/` if the source
   contract or consumer boundary changes.

See `docs/README.md` for the current architecture map and historical-document
guidance.
