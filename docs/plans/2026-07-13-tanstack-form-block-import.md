# TanStack Form Block Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the reusable TanStack Form baseline into the Next.js block directory, remove the unused React Hook Form stack, and leave a verified typed consumption path without integrating a product form.

**Architecture:** Preserve the five supporting files from `hatdoggy/form-architecture` commit `ca4e920d21a48bb569d120b0a6efc064ac17b634` unchanged under `nextjs/components/blocks/Form/`. Exclude the full-form demonstration, keep feature schemas outside the block in future consumers, and let TanStack Form infer field paths and values from each consumer's typed `formOptions`.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, TanStack Form 1.33, TanStack Form Next.js 1.33, Zod 4, pnpm 10.

---

### Task 1: Replace the form dependencies

**Files:**
- Modify: `nextjs/package.json`
- Modify: `nextjs/pnpm-lock.yaml`

- [ ] **Step 1: Remove the unused React Hook Form packages**

Run from the repository root:

```powershell
pnpm --dir nextjs remove react-hook-form @hookform/resolvers
```

Expected: both package names disappear from `nextjs/package.json`, and pnpm updates `nextjs/pnpm-lock.yaml` without npm-generated files.

- [ ] **Step 2: Add the external block's TanStack dependencies**

Run from the repository root:

```powershell
pnpm --dir nextjs add '@tanstack/react-form@^1.33.1' '@tanstack/react-form-nextjs@^1.33.1'
```

Expected: both TanStack packages appear under `dependencies` in `nextjs/package.json`, and pnpm resolves them in `nextjs/pnpm-lock.yaml`.

- [ ] **Step 3: Verify the package-manager boundary**

Run:

```powershell
rg -n 'react-hook-form|@hookform/resolvers|@tanstack/react-form' nextjs/package.json nextjs/pnpm-lock.yaml
Get-ChildItem -LiteralPath . -Filter 'package-lock.json' -Recurse
```

Expected: matches exist only for the two TanStack packages; no `package-lock.json` exists.

### Task 2: Import the five-file form baseline

**Files:**
- Create: `nextjs/components/blocks/Form/form-fields.block.tsx`
- Create: `nextjs/components/blocks/Form/form-options.ts`
- Create: `nextjs/components/blocks/Form/form-submit.action.ts`
- Create: `nextjs/components/blocks/Form/form.schema.ts`
- Create: `nextjs/components/blocks/Form/use-form.hook.ts`

- [ ] **Step 1: Read the pinned raw sources without cloning or pulling**

Read these files from the Gitea raw endpoints at commit `ca4e920d21a48bb569d120b0a6efc064ac17b634`:

```text
src/features/form/form-fields.block.tsx
src/features/form/form-options.ts
src/features/form/form-submit.action.ts
src/features/form/form.schema.ts
src/features/form/use-form.hook.ts
```

Expected: the source set contains the contexts, registered controls, shared options/schema, server action, and generated hook. `src/features/form/form-full.block.tsx` is identified separately as the usage demonstration.

- [ ] **Step 2: Create the destination files with unchanged source content**

Use the repository editing mechanism to add each pinned source file verbatim at its corresponding path under `nextjs/components/blocks/Form/`. Do not rewrite imports, formatting, comments, schemas, or helper APIs.

Expected: exactly five new source files exist, and `nextjs/components/blocks/Form/form-full.block.tsx` does not exist.

- [ ] **Step 3: Compare every imported file with Gitea**

For each source/destination pair, fetch the raw source into memory and compare normalized LF text with `Get-Content -Raw` from the destination.

```powershell
$commit = 'ca4e920d21a48bb569d120b0a6efc064ac17b634'
$files = @(
  'form-fields.block.tsx',
  'form-options.ts',
  'form-submit.action.ts',
  'form.schema.ts',
  'use-form.hook.ts'
)

foreach ($file in $files) {
  $remote = Invoke-RestMethod -Uri "https://gitea.tsantos.dev/hatdoggy/form-architecture/raw/commit/$commit/src/features/form/$file"
  $local = Get-Content -Raw -LiteralPath "nextjs/components/blocks/Form/$file"
  if (($remote -replace "`r`n", "`n").TrimEnd("`n") -ne ($local -replace "`r`n", "`n").TrimEnd("`n")) {
    throw "Imported content differs: $file"
  }
}
```

Expected: the command exits successfully with no mismatch exception.

- [ ] **Step 4: Confirm the example was excluded**

Run:

```powershell
Test-Path -LiteralPath 'nextjs/components/blocks/Form/form-full.block.tsx'
```

Expected: `False`.

### Task 3: Align repository guidance and verify consumption typing

**Files:**
- Modify: `nextjs/code-style.md:12`
- Verify: `nextjs/components/blocks/Form/use-form.hook.ts`

- [ ] **Step 1: Update the documented form stack**

Replace the form-handling table value:

```markdown
| **Form handling** | TanStack Form + Zod |
```

Expected: `nextjs/code-style.md` no longer directs contributors to React Hook Form.

- [ ] **Step 2: Confirm the intended typed consumer API is exported**

Run:

```powershell
rg -n 'export const \{ useAppForm, withForm \}|createFormHookContexts|useFieldContext' nextjs/components/blocks/Form
```

Expected: `use-form.hook.ts` exports `useAppForm`, `withForm`, and `useFieldContext`. These APIs infer valid `AppField` paths and value types from a consumer's feature-local typed `formOptions`; `useGenerateForm` remains pinned to the copied example schema and is not the recommended entry point for product forms.

- [ ] **Step 3: Confirm React Hook Form is fully purged**

Run:

```powershell
rg -n -i 'react-hook-form|@hookform/resolvers' nextjs
```

Expected: no matches.

### Task 4: Validate the imported block and final diff

**Files:**
- Verify: `nextjs/components/blocks/Form/*.ts*`
- Verify: `nextjs/package.json`
- Verify: `nextjs/pnpm-lock.yaml`
- Verify: `nextjs/code-style.md`

- [ ] **Step 1: Run TypeScript**

Run:

```powershell
pnpm --dir nextjs exec tsc --noEmit
```

Expected: exit code 0. If the unchanged upstream baseline exposes an incompatibility with this repository's existing UI primitives or compiler settings, report the exact error without adapting the copied files because adaptation is outside the 1:1 scope.

- [ ] **Step 2: Run lint**

Run:

```powershell
pnpm --dir nextjs lint
```

Expected: exit code 0 with no new lint errors.

- [ ] **Step 3: Check whitespace and scope**

Run:

```powershell
git diff --check
git status --short --branch
git diff --stat main...HEAD
git diff main...HEAD
```

Expected: the diff contains only the approved design/plan audit trail, five imported block files, the dependency/lockfile replacement, and the single code-style update. Existing user-owned work remains present.

- [ ] **Step 4: Report the typed consumption pattern**

In the handoff, explain that a feature should define typed `defaultValues` and validators with TanStack `formOptions`, then pass those options to the block's `useAppForm`/`withForm`. State explicitly that this yields field-name autocomplete and inferred field values, while the copied `useGenerateForm` is example-schema-specific.

### Task 5: Add block-local consumption documentation

**Files:**
- Create: `nextjs/components/blocks/Form/README.md`

- [ ] **Step 1: Document the block boundary and API**

Create a block-local guide that identifies the five unchanged upstream source
files, explains that the README is local documentation, lists the TanStack/Zod
dependencies, and maps `useAppForm`, `withForm`, `useFieldContext`, and the
registered field components to their responsibilities.

- [ ] **Step 2: Document the recommended typed setup**

Include a complete client-component example using feature-local Zod schema,
typed `defaultValues`, TanStack `formOptions`, `useAppForm`, `form.AppForm`, and
`form.AppField`. Show text, textarea, and string-valued select controls, plus
submission through `form.handleSubmit()`.

- [ ] **Step 3: Document composition and server boundaries**

Show how `withForm` carries the same options into a split layout. Explain that
real server actions should validate feature-owned schemas and return the
application's normal action-result contract. Explicitly label
`useGenerateForm`, `form.schema.ts`, `form-options.ts`, and
`form-submit.action.ts` as preserved upstream example-path code rather than the
recommended product API.

- [ ] **Step 4: Verify documentation accuracy and source fidelity**

Run:

```powershell
rg -n 'useAppForm|withForm|useFieldContext|FormTextInput|FormTextarea|FormSelect|useGenerateForm' nextjs/components/blocks/Form/README.md
pnpm --dir nextjs exec tsc --noEmit
git diff --check
```

Expected: every public usage concept appears in the README, TypeScript exits 0,
and the diff check reports no whitespace errors. Re-run the pinned raw-source
comparison to confirm the five imported TypeScript files remain unchanged.
