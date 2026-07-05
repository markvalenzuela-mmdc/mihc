# Testing Strategy — Brainstorm

## Context

The MMDC Testing Dashboard (`nextjs/`) has zero automated tests. It's a Next.js 16 App Router app with server actions, route handlers, Drizzle ORM, feature services, repositories, and React components. The separate `playwright/` package already has a mature Playwright setup with a custom reporter and `TestResult` schema — but it only tests the external MMDC website.

Goal: build a test suite covering the Next.js backend and frontend.

## Requirements

- Backend: test route handlers, server actions, services, repositories, and Zod schemas
- Frontend: test React components, user flows, critical pages
- Fast feedback loop for unit tests
- Real browser testing for E2E flows
- Reuse existing Playwright infrastructure (reporter, TestResult schema, run-mode tracking)
- Handle database-dependent tests (mock for unit, real test DB for integration)

## Key Decisions

### Tool Selection: Vitest + Playwright (not one or the other)

- **Playwright alone** can't properly test individual service/repository functions, Zod validators, or component rendering state — those don't need a browser and would be slow/heavy.
- **Vitest alone** can't verify real browser rendering, visual regressions, or end-to-end user flows.
- These are complementary, not competing.

### Backend Unit Tests → Vitest

Services already accept optional `DbExecutor` injection (`db: DbExecutor = getDb()`). This makes mocking trivial — no DI framework needed. `vi.mock` the db module, provide a stubbed executor, test service logic in isolation.

### Backend Integration Tests → Vitest

Route handlers are thin wrappers around services. Test by constructing `NextRequest` objects and calling the handler function directly. Use a real test database (separate `TEST_DATABASE_URL`). Run migrations and seed before each suite.

### Frontend Component Tests → Vitest + React Testing Library

Components use TanStack Query hooks for data. Mock the query hooks with `vi.mock`, test each state (loading, empty, error, data). Test interactive behavior (table sorting, sheet open/close, skeleton visibility).

### E2E Tests → Playwright (extend existing playwright/ package)

Add a Next.js-specific project to the existing `playwright/playwright.config.ts` with `baseURL: 'http://localhost:3000'`. Reuse the custom reporter and `TestResult` schema. Auto-start the dev server via `webServer` config.

### Test DB Strategy: Both Mocks and Real DB

| Approach | Use Case |
|----------|----------|
| `vi.mock` on `@/lib/drizzle/db` | Unit tests for services/repos — inject mocked DbExecutor |
| Real test PostgreSQL with migrations | Integration tests for route handlers — catch actual query bugs, transaction behavior, constraint violations |

### Playwright Location: Extend existing playwright/

Add new project entries to `playwright/playwright.config.ts`. Benefits:
- Reuses custom reporter (`reporters/results-reporter.ts`)
- Reuses `TestResult` schema (`lib/results.ts`)
- Reuses smoke check helpers (`lib/smoke.ts`)
- Reuses run-mode tracking (automated vs manual)
- Single report output location (`playwright/results/`)

## Rejected / Considered

- **Playwright for everything** — Overkill for service tests. No access to React component internals for state testing. Makes mocking DB impractical.
- **Vitest for everything** — No real browser. Can't test visual rendering, client-side navigation, or browser APIs.
- **Jest instead of Vitest** — Vitest is faster, natively understands ESM/TypeScript, and integrates with Vite (which Next.js uses under the hood).
- **New separate Playwright config in nextjs/** — Would duplicate the reporter, TestResult schema, and run-mode infrastructure already in `playwright/`.
- **Single test database with fixtures** — Mixed approach is better: mock for fast unit tests, real DB for integration to catch real query issues.

## Open / Future

- Visual regression testing (Playwright screenshot comparisons)
- Performance testing (Lighthouse CI integration)
- Test coverage reporting
- CI pipeline integration (GitHub Actions workflow that runs both `pnpm test` in nextjs/ and `pnpm test:nextjs` in playwright/)
- Component story / screenshot tests with Chromatic or similar
