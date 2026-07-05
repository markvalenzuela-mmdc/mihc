# Testing Strategy Plan

## Overview

Build a comprehensive test suite for the Next.js backend and frontend using Vitest (unit + integration + component tests) and Playwright (E2E tests). The existing `playwright/` package is extended with Next.js-specific project configs rather than duplicated.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Test Suite                         │
├──────────────┬───────────────┬───────────────────────┤
│   Vitest     │   Vitest      │    Playwright          │
│   (unit)     │   (integration│    (E2E)               │
│              │   + component)│                         │
├──────────────┼───────────────┼───────────────────────┤
│ Services     │ Route handlers│ Pages / user flows     │
│ Repositories │ Server actions│ API endpoint health    │
│ Zod schemas  │ DB operations │ Critical paths         │
│ Utils        │ Components    │ Smoke check reuse      │
├──────────────┼───────────────┼───────────────────────┤
│ Mock DB      │ Real test DB  │ Real browser + server  │
└──────────────┴───────────────┴───────────────────────┘
```

---

## Phase 1: Vitest Setup in `nextjs/`

### 1.1 Install Dependencies

```sh
cd nextjs
pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

### 1.2 vitest.config.ts

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
    },
  },
})
```

### 1.3 Package Scripts

Add to `nextjs/package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 1.4 Test Setup File

`nextjs/__tests__/setup.ts`:
- Import `@testing-library/jest-dom` for DOM matchers
- Configure global mocks (e.g., `window.matchMedia` for responsive components)

### 1.5 Directory Structure

```
nextjs/
  __tests__/
    setup.ts                       # Global test setup
    unit/
      services/
        smoke/
          smoke-test-runs.service.test.ts
          smoke-test-results.service.test.ts
          smoke-test-apps.service.test.ts
        e2e/
          e2e-profile.service.test.ts
      schema/
        smoke-test-runs.schema.test.ts
      utils/
        server-action-return.test.ts
      lib/
        pagination.test.ts
    integration/
      api/
        smoke-runs.test.ts         # GET /api/smoke-runs/[runId]
        e2e-profiles.test.ts       # CRUD /api/e2e-profiles/[profileId]
      db/
        smoke-queries.test.ts      # Real DB: insert + query smoke_runs
    components/
      smoke/
        smoke-testing-table.test.tsx
        smoke-run-details-sheet.test.tsx
      e2e/
        e2e-testing-profiles-table.test.tsx
```

---

## Phase 2: Backend Unit Tests (Vitest)

### 2.1 Service Tests

Pattern: services accept `db: DbExecutor = getDb()`. Mock via `vi.mock`.

```ts
// __tests__/unit/services/smoke/smoke-test-runs.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the DB module
const mockDb = {
  query: {
    smokeRuns: {
      findMany: vi.fn(),
    },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
}

vi.mock('@/lib/drizzle/db', () => ({
  getDb: () => mockDb,
}))

describe('getPaginatedSmokeTestRuns', () => {
  it('returns paginated runs for an app', async () => {
    // ...
  })
})
```

Test targets:

| File | What to test |
|------|-------------|
| `feature/smoke/services/smoke-test-runs.service.ts` | Pagination params, tab filtering, ordering |
| `feature/smoke/services/smoke-test-results.service.ts` | Aggregate result lookup by runId |
| `feature/smoke/services/smoke-test-apps.service.ts` | App listing queries |
| `feature/e2e/services/e2e-profile.service.ts` | Profile CRUD operations |
| `feature/smoke/schema/smoke-test-runs.schema.ts` | Valid/invalid enum values for status |
| `lib/drizzle/pagination.ts` | Offset calculation, page boundary, zero items |
| `utils/server-action-return.ts` | `ok()` shape, `err()` shape |

### 2.2 Schema Tests

Test Zod validators with valid and invalid inputs. No mocking needed — pure data tests.

```ts
describe('smokeRunsStatusSchema', () => {
  it('accepts valid status values', () => {
    expect(smokeRunsStatusSchema.parse('success')).toBe('success')
    expect(smokeRunsStatusSchema.parse('degraded')).toBe('degraded')
    expect(smokeRunsStatusSchema.parse('failure')).toBe('failure')
  })

  it('rejects invalid status values', () => {
    expect(() => smokeRunsStatusSchema.parse('unknown')).toThrow()
    expect(() => smokeRunsStatusSchema.parse('')).toThrow()
  })
})
```

---

## Phase 3: Backend Integration Tests (Vitest)

### 3.1 Route Handler Tests

Test route handlers by calling the exported function directly with constructed `NextRequest`.

```ts
// __tests__/integration/api/smoke-runs.test.ts
import { GET } from '@/app/api/smoke-runs/[runId]/route'
import { NextRequest } from 'next/server'

describe('GET /api/smoke-runs/[runId]', () => {
  it('returns 404 for unknown runId', async () => {
    const req = new NextRequest('http://localhost:3000/api/smoke-runs/nonexistent')
    const res = await GET(req, { params: Promise.resolve({ runId: 'nonexistent' }) })
    expect(res.status).toBe(404)
  })

  it('returns run details with app name', async () => {
    // Assumes test DB is seeded with known runId
    const req = new NextRequest('http://localhost:3000/api/smoke-runs/known-id')
    const res = await GET(req, { params: Promise.resolve({ runId: 'known-id' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('appName')
    expect(body).toHaveProperty('details')
    expect(body).toHaveProperty('results')
  })
})
```

### 3.2 Test Database Setup

Add `nextjs/scripts/setup-test-db.ts`:

```ts
// Creates test DB from TEST_DATABASE_URL env var
// Runs drizzle-kit migrate
// Seeds known test data
```

The integration tests call this before the suite runs (via `beforeAll` or a global setup file).

### 3.3 Database Integration Tests

Test Drizzle queries against a real test database:

```ts
// __tests__/integration/db/smoke-queries.test.ts
import { getDb } from '@/lib/drizzle/db'
import { smokRuns } from '@/lib/drizzle/schema/apps'

describe('smoke_runs queries', () => {
  it('inserts and retrieves a run with sequential run_number', async () => {
    const db = getDb()
    // INSERT, then SELECT, verify run_number increments per app
  })
})
```

---

## Phase 4: Frontend Component Tests (Vitest + RTL)

### 4.1 Component Test Pattern

Mock TanStack Query hooks, test all rendering states.

```ts
// __tests__/components/smoke/smoke-testing-table.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock the query hook
vi.mock('@/feature/smoke/query/smoke-run-details.query', () => ({
  useSmokeTestRuns: vi.fn(),
}))

describe('SmokeTestingTable', () => {
  it('shows loading skeleton', () => {
    mockUseSmokeTestRuns.mockReturnValue({ isLoading: true, data: undefined })
    render(<SmokeTestingTable appId="website" />)
    expect(screen.getByTestId('table-skeleton')).toBeInTheDocument()
  })

  it('shows empty state', () => {
    mockUseSmokeTestRuns.mockReturnValue({ isLoading: false, data: [], isError: false })
    render(<SmokeTestingTable appId="website" />)
    expect(screen.getByText(/no tests/i)).toBeInTheDocument()
  })

  it('renders runs in table rows', () => {
    mockUseSmokeTestRuns.mockReturnValue({
      isLoading: false,
      data: [{ runNumber: 1, status: 'success', checkedAt: '2026-01-01' }],
    })
    // ...
  })

  it('shows error state', () => {
    mockUseSmokeTestRuns.mockReturnValue({ isLoading: false, isError: true })
    render(<SmokeTestingTable appId="website" />)
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
```

Test targets:

| Component | States to test |
|-----------|---------------|
| `smoke-testing-table.tsx` | loading, empty, data, error |
| `smoke-testing-cards.tsx` | loading skeleton, app cards, filter tabs |
| `smoke-run-details-sheet.tsx` | loading skeleton, populated data, error |
| `e2e-testing-profiles-table.tsx` | loading, empty, data, error, column sorting |
| `e2e-profile-workspace-sheet.tsx` | loading skeleton, runs list, steps + tests expand |

---

## Phase 5: E2E Tests (Playwright)

### 5.1 Playwright Config Changes

Add to `playwright/playwright.config.ts`:

```ts
// New project for Next.js app
{
  name: 'nextjs-chromium',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3000',
  },
  metadata: { target: 'mihc-nextjs', type: 'e2e' },
},
```

Add `webServer` block:

```ts
webServer: {
  command: 'cd ../nextjs && pnpm dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  cwd: __dirname,
},
```

### 5.2 Test Files

New dir: `playwright/tests/nextjs/`

Test targets:

| Spec File | What to test |
|-----------|-------------|
| `homepage.spec.ts` | Root page loads, navigation links present |
| `smoke-testing.spec.ts` | `/smoke-testing` loads, apps visible, filter tabs work, click row opens details sheet |
| `e2e-testing.spec.ts` | `/e2e-testing` loads, profiles table visible, click profile opens workspace sheet |
| `settings.spec.ts` | `/settings` loads, settings sections present |
| `api-health.spec.ts` | Use `request` fixture to hit API endpoints, check 200/404 responses |

### 5.3 Reuse Existing Infrastructure

Tests use the existing `lib/smoke.ts` helpers (check, expect.soft pattern) and write results through the custom reporter. The `TestResult` schema already supports `type: 'e2e'` — use that.

### 5.4 Run Scripts

Add to `playwright/package.json`:

```json
{
  "scripts": {
    "test:nextjs": "playwright test tests/nextjs --project=nextjs-chromium"
  }
}
```

---

## Phase 6: Root-Level Orchestration

Add to root `justfile`:

```just
# Run all Next.js tests
test-nextjs:
    cd nextjs && pnpm test
    cd playwright && pnpm test:nextjs

# Run unit tests only
test-nextjs-unit:
    cd nextjs && pnpm test -- --reporter=verbose

# Run E2E tests only
test-nextjs-e2e:
    cd playwright && pnpm test:nextjs
```

---

## File Changes Summary

```
nextjs/
  __tests__/                          (NEW) — test directory
  vitest.config.ts                     (NEW)
  package.json                        (EDIT) — add test scripts, devDependencies
  scripts/setup-test-db.ts            (NEW)

playwright/
  playwright.config.ts                 (EDIT) — add nextjs-chromium project, webServer
  tests/nextjs/                        (NEW) — Next.js E2E spec files
  package.json                        (EDIT) — add test:nextjs script

justfile                               (EDIT) — add test-nextjs commands
docs/
  brainstorm/testing-strategy.md       (NEW) — this document's brainstorm
  plans/testing-strategy.md            (NEW) — this document
```

---

## Decisions & Rationale

| Decision | Rationale |
|----------|-----------|
| Vitest for unit/integration, Playwright for E2E | Services and schemas don't need a browser; user flows do |
| `DbExecutor` injection for unit tests | Already exists in services — no refactor needed for testability |
| `vi.mock` on `@/lib/drizzle/db` for unit tests | Avoids real DB connections; keeps unit tests fast and isolated |
| Separate test database for integration | Catches real SQL bugs, constraint violations, transaction behavior |
| Extend `playwright/` not duplicate | Reuses custom reporter, TestResult schema, run-mode tracking |
| `NextRequest` constructor for route handler tests | Tests the handler function directly — no need to spin up a server |
| jsdom environment for component tests | Lightweight — no browser needed for component rendering tests |
| Mock TanStack Query hooks for component tests | Isolates UI behavior from data fetching; precise state control |
