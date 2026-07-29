# Next.js Docker Dependency Install Deduplication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use $subagent-driven-development (recommended) or $executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the second Next.js dependency installation while preserving the existing build and runtime dependency boundaries.

**Architecture:** Install the complete dependency graph once in `deps`. Branch `builder` and `runtime-deps` from that stage, retaining all dependencies for `pnpm build` while pruning development dependencies from the runtime branch.

**Tech Stack:** Docker BuildKit, Node.js 24 Alpine, pnpm 10, Next.js 16 standalone output

---

### Task 1: Deduplicate, verify, and commit the dependency stages

**Files:**
- Modify: `nextjs/Dockerfile:16`

- [ ] **Step 1: Confirm the current Dockerfile contains two installs**

Run from the repository root:

```powershell
(rg -n "^RUN pnpm install" nextjs/Dockerfile | Measure-Object).Count
```

Expected: `2`.

- [ ] **Step 2: Replace the `runtime-deps` stage**

Replace:

```dockerfile
FROM base AS runtime-deps

COPY packages/enrollmate-contract ./packages/enrollmate-contract
COPY nextjs/package.json nextjs/pnpm-lock.yaml nextjs/pnpm-workspace.yaml ./nextjs/
WORKDIR /app/nextjs
RUN pnpm install --prod --frozen-lockfile --ignore-scripts
```

With:

```dockerfile
FROM deps AS runtime-deps

RUN pnpm prune --prod --ignore-scripts
```

- [ ] **Step 3: Confirm the Dockerfile now installs once and prunes once**

Run:

```powershell
(rg -n "^RUN pnpm install" nextjs/Dockerfile | Measure-Object).Count
(rg -n "^RUN pnpm prune --prod --ignore-scripts$" nextjs/Dockerfile | Measure-Object).Count
```

Expected:

```text
1
1
```

- [ ] **Step 4: Build the runner target**

Run:

```powershell
docker build --target runner -t mihc-nextjs-prune-verification -f nextjs/Dockerfile .
```

Expected: Docker exits with status `0`; the log shows `pnpm prune --prod --ignore-scripts` completing successfully.

- [ ] **Step 5: Verify production tools are present and development tools are absent**

Run:

```powershell
docker run --rm --entrypoint sh mihc-nextjs-prune-verification -c 'test -x /app/nextjs/node_modules/.bin/tsx && test -e /app/nextjs/node_modules/drizzle-orm && test -e /app/nextjs/node_modules/pg && test ! -x /app/nextjs/node_modules/.bin/vitest && test ! -x /app/nextjs/node_modules/.bin/tsc && test ! -x /app/nextjs/node_modules/.bin/drizzle-kit'
```

Expected: exit status `0` with no output.

- [ ] **Step 6: Import both database startup modules**

Run:

```powershell
docker run --rm --entrypoint /app/nextjs/node_modules/.bin/tsx -w /app/nextjs mihc-nextjs-prune-verification -e "Promise.all([import('./scripts/release-database.ts'), import('./scripts/reset-production-database.ts')]).then(() => console.log('startup-imports=ok'))"
```

Expected:

```text
startup-imports=ok
```

- [ ] **Step 7: Verify the standalone server starts**

Run:

```powershell
docker run -d --name mihc-nextjs-prune-smoke --entrypoint node mihc-nextjs-prune-verification /app/server.js
Start-Sleep -Seconds 2
docker exec mihc-nextjs-prune-smoke node -e "fetch('http://127.0.0.1:3000/favicon.ico').then(response => { console.log('status=' + response.status); process.exit(response.ok ? 0 : 1) }).catch(error => { console.error(error); process.exit(1) })"
docker rm -f mihc-nextjs-prune-smoke
```

Expected:

```text
status=200
```

- [ ] **Step 8: Remove the temporary verification image**

Run:

```powershell
docker image rm mihc-nextjs-prune-verification
```

Expected: Docker reports that the temporary image tag was removed.

- [ ] **Step 9: Inspect the final diff**

Run:

```powershell
git diff -- nextjs/Dockerfile
git diff --check
git status --short
```

Expected:

- `nextjs/Dockerfile` replaces the independent production install with a prune.
- The approved design and this plan remain committed.
- No unrelated files are modified.
- `git diff --check` exits with status `0`.

- [ ] **Step 10: Commit the Dockerfile change**

Run:

```powershell
git add -- nextjs/Dockerfile
git commit -m "build(docker): deduplicate Next.js dependency install"
```

Expected: one commit containing only the `nextjs/Dockerfile` implementation change.
