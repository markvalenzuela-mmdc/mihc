# Production Database Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use $subagent-driven-development (recommended) or $executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an automatic production database release gate that applies committed Drizzle migrations and idempotently seeds a deployment-configured maintainer plus the four Smoke Testing apps without loading development fixtures.

**Architecture:** Extract the stable Smoke Testing app catalog into a shared seed unit, then add a production-only bootstrap that creates the maintainer through Better Auth and reconciles app records through Drizzle. A dedicated Docker image target runs validation, Drizzle migrations, and bootstrap as a one-shot Compose service; Next.js and Playwright depend on its successful completion while local `just db seed` retains the full fixture dataset.

**Tech Stack:** TypeScript 5, Node.js 24, Drizzle ORM/Kit, PostgreSQL, Better Auth, Zod 4, Vitest, Docker multi-stage builds, Docker Compose, GitHub Actions, Just.

---

## File Map

### New files

- `nextjs/lib/drizzle/seed/seed-apps.ts` — canonical Smoke Testing app catalog and owner-aware idempotent app upsert.
- `nextjs/lib/drizzle/seed/production-config.ts` — strict parsing and normalization of production maintainer variables.
- `nextjs/lib/drizzle/seed/seed-production.ts` — Better Auth maintainer creation/reconciliation and production app bootstrap.
- `nextjs/scripts/release-database.ts` — production-only migrate-then-bootstrap command used by the release container.
- `nextjs/__tests__/unit/lib/drizzle/seed/seed-apps.test.ts` — shared app seed unit coverage.
- `nextjs/__tests__/unit/lib/drizzle/seed/production-config.test.ts` — required-variable, email, and password validation coverage.
- `nextjs/__tests__/unit/scripts/release-database.test.ts` — release ordering, environment guard, and cleanup coverage.
- `nextjs/__tests__/integration/production-bootstrap.test.ts` — fresh-database and repeat-run behavior through PostgreSQL and Better Auth.

### Modified files

- `nextjs/lib/drizzle/seed/seed-operator.ts` — keep the development operator but delegate app writes to `seedSmokeApps`.
- `nextjs/scripts/setup-test-db.ts` — support a migrated-but-unseeded integration database.
- `nextjs/package.json` — expose `db:release`.
- `commands/db.just` — expose the guarded release command for operator retry.
- `commands/docker.just` — load the ignored deploy environment for deploy operations.
- `nextjs/Dockerfile` — add the standalone `database-release` image target.
- `.github/workflows/build-nextjs.yml` — publish both the application and database-release images.
- `docker/compose.build.yml` — exercise the release service in the local production-image workflow.
- `docker/compose.deploy.yml` — require deployment configuration and gate app services on the release service.
- `docker/.env.build.example` — provide local-only values for testing the production-image workflow.
- `docker/.env.deploy.example` — document every required runtime and bootstrap variable without usable secrets.
- `README.md` — distinguish development seed and production release commands.
- `docker/README.md` — document the database-release service.
- `docs/containerized-infrastructure.md` — document automatic deployment order, secrets, retry, backup, and rollback.
- `docs/docker-commands.md` — document Compose validation and database-release recovery commands.

No Drizzle SQL migration is created: the `user`, `account`, and `apps` tables already exist. The release service applies the existing committed migration journal and all future generated migrations.

---

### Task 1: Extract the canonical Smoke Testing app seed

**Files:**

- Create: `nextjs/lib/drizzle/seed/seed-apps.ts`
- Create: `nextjs/__tests__/unit/lib/drizzle/seed/seed-apps.test.ts`
- Modify: `nextjs/lib/drizzle/seed/seed-operator.ts`

- [ ] **Step 1: Write the failing shared app-seed unit test**

Create `nextjs/__tests__/unit/lib/drizzle/seed/seed-apps.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import {
  SMOKE_TESTING_APPS,
  seedSmokeTestingApps,
} from "@/lib/drizzle/seed/seed-apps";

function createFakeTransaction() {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));

  return {
    tx: { insert } as never,
    insert,
    values,
    onConflictDoUpdate,
  };
}

describe("seedSmokeTestingApps", () => {
  it("upserts the stable app catalog with the supplied audit owner", async () => {
    const fake = createFakeTransaction();

    await expect(
      seedSmokeTestingApps(fake.tx, "maintainer-id"),
    ).resolves.toEqual([
      "Seeded app: Website",
      "Seeded app: Enrollmate",
      "Seeded app: Enrollmate CLP",
      "Seeded app: Self-hosted n8n",
    ]);

    expect(SMOKE_TESTING_APPS.map(({ id }) => id)).toEqual([
      "website",
      "enrollmate",
      "enrollmate-clp",
      "n8n",
    ]);
    expect(fake.insert).toHaveBeenCalledTimes(4);
    expect(fake.values.mock.calls.map(([value]) => value)).toEqual(
      SMOKE_TESTING_APPS.map((app) => ({
        ...app,
        createdBy: "maintainer-id",
        updatedBy: "maintainer-id",
      })),
    );
    expect(fake.onConflictDoUpdate).toHaveBeenCalledTimes(4);
  });
});
```

- [ ] **Step 2: Run the test and verify that the new module is missing**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/lib/drizzle/seed/seed-apps.test.ts
```

Expected: FAIL because `@/lib/drizzle/seed/seed-apps` does not exist.

- [ ] **Step 3: Implement the canonical app catalog and upsert**

Create `nextjs/lib/drizzle/seed/seed-apps.ts`:

```ts
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { apps } from "../schema";
import type * as schema from "../schema";

export const SMOKE_TESTING_APPS = [
  {
    id: "website",
    name: "Website",
    description: "Public marketing and admissions website",
  },
  {
    id: "enrollmate",
    name: "Enrollmate",
    description: "Student enrollment workflow",
  },
  {
    id: "enrollmate-clp",
    name: "Enrollmate CLP",
    description: "CLP enrollment support surface",
  },
  {
    id: "n8n",
    name: "Self-hosted n8n",
    description: "Automation workflow instance",
  },
] as const;

export async function seedSmokeTestingApps(
  tx: NodePgDatabase<typeof schema>,
  ownerId: string,
) {
  const messages: string[] = [];

  for (const app of SMOKE_TESTING_APPS) {
    const values = {
      ...app,
      createdBy: ownerId,
      updatedBy: ownerId,
    };

    await tx.insert(apps).values(values).onConflictDoUpdate({
      target: apps.id,
      set: {
        name: values.name,
        description: values.description,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
      },
    });
    messages.push(`Seeded app: ${app.name}`);
  }

  return messages;
}
```

In `nextjs/lib/drizzle/seed/seed-operator.ts`:

1. Remove the `apps` import and the local `smokeApps` array.
2. Import `seedSmokeTestingApps` from `./seed-apps`.
3. Replace the app loop with:

```ts
messages.push(...await seedSmokeTestingApps(tx, currentOperator.id));
```

Keep the current development operator insert unchanged.

- [ ] **Step 4: Run the focused and existing seed tests**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/lib/drizzle/seed/seed-apps.test.ts __tests__/unit/lib/drizzle/seed/seed-auth.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the shared seed extraction**

```bash
git add nextjs/lib/drizzle/seed/seed-apps.ts nextjs/lib/drizzle/seed/seed-operator.ts nextjs/__tests__/unit/lib/drizzle/seed/seed-apps.test.ts
git commit -m "refactor(database): share smoke app seed"
```

---

### Task 2: Validate production maintainer configuration

**Files:**

- Create: `nextjs/lib/drizzle/seed/production-config.ts`
- Create: `nextjs/__tests__/unit/lib/drizzle/seed/production-config.test.ts`

- [ ] **Step 1: Write failing configuration tests**

Create `nextjs/__tests__/unit/lib/drizzle/seed/production-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { getProductionSeedConfig } from "@/lib/drizzle/seed/production-config";

const validEnvironment = {
  PROD_MAINTAINER_NAME: "Production Maintainer",
  PROD_MAINTAINER_EMAIL: " Maintainer@Example.com ",
  PROD_MAINTAINER_PASSWORD: "safe-password-123",
};

describe("getProductionSeedConfig", () => {
  it("trims the name and normalizes the email", () => {
    expect(getProductionSeedConfig(validEnvironment)).toEqual({
      name: "Production Maintainer",
      email: "maintainer@example.com",
      password: "safe-password-123",
    });
  });

  it.each([
    "PROD_MAINTAINER_NAME",
    "PROD_MAINTAINER_EMAIL",
    "PROD_MAINTAINER_PASSWORD",
  ] as const)("rejects a missing %s", (key) => {
    const environment: Record<string, string | undefined> = {
      ...validEnvironment,
    };
    delete environment[key];

    expect(() => getProductionSeedConfig(environment)).toThrow();
  });

  it("rejects an invalid email", () => {
    expect(() =>
      getProductionSeedConfig({
        ...validEnvironment,
        PROD_MAINTAINER_EMAIL: "not-an-email",
      }),
    ).toThrow();
  });

  it.each(["short", "x".repeat(129)])(
    "rejects a password outside Better Auth's 8-128 character policy",
    (password) => {
      expect(() =>
        getProductionSeedConfig({
          ...validEnvironment,
          PROD_MAINTAINER_PASSWORD: password,
        }),
      ).toThrow();
    },
  );
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/lib/drizzle/seed/production-config.test.ts
```

Expected: FAIL because `production-config.ts` does not exist.

- [ ] **Step 3: Implement strict production configuration parsing**

Create `nextjs/lib/drizzle/seed/production-config.ts`:

```ts
import { z } from "zod";

const productionSeedConfigSchema = z.object({
  name: z.string().trim().min(1, "PROD_MAINTAINER_NAME is required."),
  email: z
    .email("PROD_MAINTAINER_EMAIL must be a valid email address.")
    .transform((email) => email.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "PROD_MAINTAINER_PASSWORD must contain at least 8 characters.")
    .max(128, "PROD_MAINTAINER_PASSWORD must contain at most 128 characters."),
});

export type ProductionSeedConfig = z.infer<typeof productionSeedConfigSchema>;

export function getProductionSeedConfig(
  environment: Record<string, string | undefined> = process.env,
): ProductionSeedConfig {
  return productionSeedConfigSchema.parse({
    name: environment.PROD_MAINTAINER_NAME,
    email: environment.PROD_MAINTAINER_EMAIL?.trim(),
    password: environment.PROD_MAINTAINER_PASSWORD,
  });
}
```

- [ ] **Step 4: Run the focused test**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/lib/drizzle/seed/production-config.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit production configuration validation**

```bash
git add nextjs/lib/drizzle/seed/production-config.ts nextjs/__tests__/unit/lib/drizzle/seed/production-config.test.ts
git commit -m "feat(database): validate production seed config"
```

---

### Task 3: Add the idempotent production bootstrap

**Files:**

- Create: `nextjs/lib/drizzle/seed/seed-production.ts`
- Create: `nextjs/__tests__/integration/production-bootstrap.test.ts`
- Modify: `nextjs/scripts/setup-test-db.ts`

- [ ] **Step 1: Allow integration setup to stop after migrations**

In `nextjs/scripts/setup-test-db.ts`, add:

```ts
interface SetupTestDatabaseOptions {
  seed?: boolean;
}
```

Change the function signature and seed block to:

```ts
export async function setupTestDatabase(
  { seed = true }: SetupTestDatabaseOptions = {},
) {
  const testDatabaseUrl = getRequiredEnv("TEST_DATABASE_URL");

  assertSafeTestDatabaseUrl(testDatabaseUrl);
  await ensureDatabaseExists(testDatabaseUrl);
  await resetSchema(testDatabaseUrl);
  await runMigrations(testDatabaseUrl);

  if (seed) {
    const originalDatabaseUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = testDatabaseUrl;

    try {
      await seedDatabase();
    } finally {
      if (originalDatabaseUrl) {
        process.env.DATABASE_URL = originalDatabaseUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
    }
  }

  console.log("Test database setup complete.");
}
```

Existing callers continue using the default full seed.

- [ ] **Step 2: Write the failing production-bootstrap integration test**

Create `nextjs/__tests__/integration/production-bootstrap.test.ts`:

```ts
import { count, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { authUser, apps, e2eSteps, profiles, smokeRuns } from "@/lib/drizzle/schema";
import { closeDb, getDb } from "@/lib/drizzle/db";
import { seedProductionDatabase } from "@/lib/drizzle/seed/seed-production";
import { setupTestDatabase } from "@/scripts/setup-test-db";

const maintainer = {
  name: "Production Maintainer",
  email: "production-maintainer@example.com",
  password: "safe-password-123",
};

describe("production database bootstrap", () => {
  let originalDatabaseUrl: string | undefined;

  beforeAll(async () => {
    const testDatabaseUrl = process.env.TEST_DATABASE_URL;
    if (!testDatabaseUrl) {
      throw new Error("TEST_DATABASE_URL is required for integration tests.");
    }

    originalDatabaseUrl = process.env.DATABASE_URL;
    await setupTestDatabase({ seed: false });
    process.env.DATABASE_URL = testDatabaseUrl;
  }, 120_000);

  afterAll(async () => {
    await closeDb();

    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }

    vi.unstubAllEnvs();
  });

  it("seeds only the maintainer and Smoke Testing app catalog", async () => {
    const messages = await seedProductionDatabase(getDb(), maintainer);

    const db = getDb();
    const [userCount] = await db.select({ value: count() }).from(authUser);
    const seededApps = await db
      .select({
        id: apps.id,
        createdBy: apps.createdBy,
        updatedBy: apps.updatedBy,
      })
      .from(apps)
      .orderBy(apps.id);
    const [seededMaintainer] = await db
      .select({ id: authUser.id, emailVerified: authUser.emailVerified })
      .from(authUser)
      .where(eq(authUser.email, maintainer.email));
    const [smokeRunCount] = await db.select({ value: count() }).from(smokeRuns);
    const [profileCount] = await db.select({ value: count() }).from(profiles);
    const [e2eStepCount] = await db.select({ value: count() }).from(e2eSteps);

    expect(userCount.value).toBe(1);
    expect(seededMaintainer.emailVerified).toBe(true);
    expect(seededApps).toEqual([
      {
        id: "enrollmate",
        createdBy: seededMaintainer.id,
        updatedBy: seededMaintainer.id,
      },
      {
        id: "enrollmate-clp",
        createdBy: seededMaintainer.id,
        updatedBy: seededMaintainer.id,
      },
      {
        id: "n8n",
        createdBy: seededMaintainer.id,
        updatedBy: seededMaintainer.id,
      },
      {
        id: "website",
        createdBy: seededMaintainer.id,
        updatedBy: seededMaintainer.id,
      },
    ]);
    expect(smokeRunCount.value).toBe(0);
    expect(profileCount.value).toBe(0);
    expect(e2eStepCount.value).toBe(0);
    expect(messages.join("\n")).not.toContain(maintainer.password);
  });

  it("updates identity fields without duplicating the user or resetting its password", async () => {
    await seedProductionDatabase(getDb(), {
      ...maintainer,
      name: "Renamed Production Maintainer",
      password: "different-password-456",
    });

    const db = getDb();
    const matchingUsers = await db
      .select({ name: authUser.name })
      .from(authUser)
      .where(eq(authUser.email, maintainer.email));
    const { auth } = await import("@/lib/better-auth/auth");

    expect(matchingUsers).toEqual([{ name: "Renamed Production Maintainer" }]);
    await expect(
      auth.api.signInEmail({
        body: { email: maintainer.email, password: maintainer.password },
        headers: new Headers({ host: "localhost" }),
      }),
    ).resolves.toMatchObject({ user: { email: maintainer.email } });
    await expect(
      auth.api.signInEmail({
        body: {
          email: maintainer.email,
          password: "different-password-456",
        },
        headers: new Headers({ host: "localhost" }),
      }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run the integration test and verify the missing-module failure**

Run:

```bash
cd nextjs
pnpm test -- __tests__/integration/production-bootstrap.test.ts
```

Expected: FAIL because `seed-production.ts` does not exist.

- [ ] **Step 4: Implement maintainer creation and app reconciliation**

Create `nextjs/lib/drizzle/seed/seed-production.ts`:

```ts
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { authUser } from "../schema";
import type * as schema from "../schema";
import type { ProductionSeedConfig } from "./production-config";
import { seedSmokeTestingApps } from "./seed-apps";

async function findMaintainer(
  db: NodePgDatabase<typeof schema>,
  email: string,
) {
  const [maintainer] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);

  return maintainer;
}

async function createMaintainer(config: ProductionSeedConfig) {
  const { auth } = await import("@/lib/better-auth/auth");
  const betterAuthUrl = process.env.BETTER_AUTH_URL;

  if (!betterAuthUrl) {
    throw new Error("BETTER_AUTH_URL is required to seed the maintainer.");
  }

  await auth.api.signUpEmail({
    body: config,
    headers: new Headers({ host: new URL(betterAuthUrl).host }),
  });
}

export async function seedProductionDatabase(
  db: NodePgDatabase<typeof schema>,
  config: ProductionSeedConfig,
) {
  let maintainer = await findMaintainer(db, config.email);

  if (!maintainer) {
    await createMaintainer(config);
    maintainer = await findMaintainer(db, config.email);
  }

  if (!maintainer) {
    throw new Error("Better Auth did not create the production maintainer.");
  }

  const maintainerId = maintainer.id;
  const messages = await db.transaction(async (tx) => {
    await tx
      .update(authUser)
      .set({
        name: config.name,
        emailVerified: true,
      })
      .where(eq(authUser.id, maintainerId));

    return seedSmokeTestingApps(tx, maintainerId);
  });

  return [
    `Seeded production maintainer: ${config.email}`,
    ...messages,
  ];
}
```

The existing-account path intentionally never calls a password mutation API.

- [ ] **Step 5: Run production and development seed integration coverage**

Run:

```bash
cd nextjs
pnpm test -- __tests__/integration/production-bootstrap.test.ts __tests__/integration/auth-seed.test.ts
```

Expected: PASS. The production test has no fixture histories; the existing
development test can still sign in with documented local credentials.

- [ ] **Step 6: Commit production bootstrap behavior**

```bash
git add nextjs/lib/drizzle/seed/seed-production.ts nextjs/scripts/setup-test-db.ts nextjs/__tests__/integration/production-bootstrap.test.ts
git commit -m "feat(database): add production bootstrap seed"
```

---

### Task 4: Add the guarded Drizzle release command

**Files:**

- Create: `nextjs/scripts/release-database.ts`
- Create: `nextjs/__tests__/unit/scripts/release-database.test.ts`
- Modify: `nextjs/package.json`
- Modify: `commands/db.just`

- [ ] **Step 1: Write failing release-runner unit tests**

Create `nextjs/__tests__/unit/scripts/release-database.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { releaseDatabase } from "@/scripts/release-database";

const environment = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:password@database:5432/mihc",
  BETTER_AUTH_URL: "https://sanity.example.com",
  PROD_MAINTAINER_NAME: "Production Maintainer",
  PROD_MAINTAINER_EMAIL: "maintainer@example.com",
  PROD_MAINTAINER_PASSWORD: "safe-password-123",
};

describe("releaseDatabase", () => {
  it("validates, migrates, seeds, and closes in order", async () => {
    const events: string[] = [];
    const pool = {
      end: vi.fn(async () => {
        events.push("pool:end");
      }),
    };
    const db = {};

    await releaseDatabase({
      environment,
      createClient: () => ({ db, pool }) as never,
      migrateDatabase: async () => {
        events.push("migrate");
      },
      seedDatabase: async (_db, config) => {
        expect(config.email).toBe("maintainer@example.com");
        events.push("seed");
        return [];
      },
      closeAuthDatabase: async () => {
        events.push("auth:end");
      },
    });

    expect(events).toEqual(["migrate", "seed", "pool:end", "auth:end"]);
  });

  it("rejects non-production execution before opening a database", async () => {
    const createClient = vi.fn();

    await expect(
      releaseDatabase({
        environment: { ...environment, NODE_ENV: "development" },
        createClient,
      }),
    ).rejects.toThrow("NODE_ENV=production");

    expect(createClient).not.toHaveBeenCalled();
  });

  it("rejects missing configuration before opening a database", async () => {
    const createClient = vi.fn();

    await expect(
      releaseDatabase({
        environment: {
          ...environment,
          PROD_MAINTAINER_PASSWORD: undefined,
        },
        createClient,
      }),
    ).rejects.toThrow();

    expect(createClient).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-script failure**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/scripts/release-database.test.ts
```

Expected: FAIL because `scripts/release-database.ts` does not exist.

- [ ] **Step 3: Implement the production-only release runner**

Create `nextjs/scripts/release-database.ts`:

```ts
import "dotenv/config";

import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import {
  closeDb,
  createDatabaseClient,
} from "@/lib/drizzle/db";
import {
  getProductionSeedConfig,
  type ProductionSeedConfig,
} from "@/lib/drizzle/seed/production-config";
import { seedProductionDatabase } from "@/lib/drizzle/seed/seed-production";

interface ReleaseDatabaseDependencies {
  environment?: Record<string, string | undefined>;
  createClient?: typeof createDatabaseClient;
  migrateDatabase?: (db: ReturnType<typeof createDatabaseClient>["db"]) => Promise<void>;
  seedDatabase?: (
    db: ReturnType<typeof createDatabaseClient>["db"],
    config: ProductionSeedConfig,
  ) => Promise<string[]>;
  closeAuthDatabase?: typeof closeDb;
}

export async function releaseDatabase({
  environment = process.env,
  createClient = createDatabaseClient,
  migrateDatabase = async (db) => {
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
  },
  seedDatabase = seedProductionDatabase,
  closeAuthDatabase = closeDb,
}: ReleaseDatabaseDependencies = {}) {
  if (environment.NODE_ENV !== "production") {
    throw new Error("Database release requires NODE_ENV=production.");
  }

  const databaseUrl = environment.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database release.");
  }

  const seedConfig = getProductionSeedConfig(environment);
  const client = createClient(databaseUrl);

  try {
    console.log("Applying Drizzle migrations...");
    await migrateDatabase(client.db);

    console.log("Running production bootstrap...");
    const messages = await seedDatabase(client.db, seedConfig);
    for (const message of messages) console.log(message);

    console.log("Database release completed.");
  } finally {
    try {
      await client.pool.end();
    } finally {
      await closeAuthDatabase();
    }
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMainModule) {
  releaseDatabase().catch((error: unknown) => {
    console.error("Database release failed.", error);
    process.exitCode = 1;
  });
}
```

- [ ] **Step 4: Add package and Just commands**

Add to `nextjs/package.json` scripts:

```json
"db:release": "tsx scripts/release-database.ts"
```

Add to `commands/db.just` before the destructive reset recipe:

```just
# Apply migrations and production bootstrap; requires NODE_ENV=production and production secrets
release:
    cd "{{ justfile_directory() }}/nextjs" && pnpm run db:release
```

- [ ] **Step 5: Run release-runner tests and type checking**

Run:

```bash
cd nextjs
pnpm test -- __tests__/unit/scripts/release-database.test.ts
pnpm exec tsc --noEmit
```

Expected: both commands PASS.

- [ ] **Step 6: Commit the release command**

```bash
git add nextjs/scripts/release-database.ts nextjs/__tests__/unit/scripts/release-database.test.ts nextjs/package.json commands/db.just
git commit -m "feat(database): add production release command"
```

---

### Task 5: Build and publish the database-release image

**Files:**

- Modify: `nextjs/Dockerfile`
- Modify: `.github/workflows/build-nextjs.yml`

- [ ] **Step 1: Add the database-release Docker target**

In `nextjs/Dockerfile`, add this stage immediately after `deps`:

```dockerfile
FROM deps AS database-release

ENV NODE_ENV="production"

COPY packages ./packages
COPY nextjs ./nextjs

WORKDIR /app/nextjs

CMD ["pnpm", "run", "db:release"]
```

This target deliberately contains the source, migration journal, `tsx`, and
Drizzle tooling. The existing final Next.js runner remains unchanged and lean.

- [ ] **Step 2: Build both Docker targets locally**

Run:

```bash
docker build --target database-release -f nextjs/Dockerfile -t mihc-nextjs-db-release:plan-check .
docker build -f nextjs/Dockerfile -t mihc-nextjs:plan-check .
```

Expected: both images build successfully. Inspect without running secrets:

```bash
docker image inspect mihc-nextjs-db-release:plan-check --format "{{json .Config.Cmd}}"
```

Expected output contains `["pnpm","run","db:release"]`.

- [ ] **Step 3: Publish the release target from GitHub Actions**

In `.github/workflows/build-nextjs.yml`:

1. Add `packages/enrollmate-contract/**` to the workflow path filter because
   both Docker targets copy the shared package.
2. Add a second metadata step:

```yaml
      - name: Extract database-release Docker metadata
        id: release-meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ steps.image.outputs.name }}-db-release
          tags: |
            type=ref,event=branch
            type=raw,value=latest,enable={{is_default_branch}}
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix=sha-
```

3. Add a second build step after the application image:

Change the existing application build cache lines to:

```yaml
          cache-from: type=gha,scope=nextjs-app
          cache-to: type=gha,mode=max,scope=nextjs-app
```

```yaml
      - name: Build and push database-release image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: ./nextjs/Dockerfile
          target: database-release
          push: true
          tags: ${{ steps.release-meta.outputs.tags }}
          labels: ${{ steps.release-meta.outputs.labels }}
          cache-from: type=gha,scope=nextjs-db-release
          cache-to: type=gha,mode=max,scope=nextjs-db-release
```

- [ ] **Step 4: Validate workflow YAML and review the Docker diff**

Run:

```bash
git diff --check
git diff -- nextjs/Dockerfile .github/workflows/build-nextjs.yml
```

Expected: no whitespace errors; the application image build remains unchanged
and the release build sets `target: database-release`.

- [ ] **Step 5: Commit image publishing**

```bash
git add nextjs/Dockerfile .github/workflows/build-nextjs.yml
git commit -m "build(database): publish release image"
```

---

### Task 6: Gate Compose application startup on database release

**Files:**

- Modify: `docker/compose.build.yml`
- Modify: `docker/compose.deploy.yml`
- Modify: `docker/.env.build.example`
- Modify: `docker/.env.deploy.example`
- Modify: `commands/docker.just`

- [ ] **Step 1: Add local production-image bootstrap values**

Append non-production example values to `docker/.env.build.example`:

```dotenv
PROD_MAINTAINER_NAME="Local Docker Maintainer"
PROD_MAINTAINER_EMAIL="docker-maintainer@example.com"
PROD_MAINTAINER_PASSWORD="local-docker-password"
```

These values are only for `just docker build`; production uses deployment
secrets and has no usable defaults.

- [ ] **Step 2: Add a release service to the build stack**

Add to `docker/compose.build.yml`:

```yaml
  db-release:
    image: mihc-nextjs-db-release:build
    build:
      context: ..
      dockerfile: nextjs/Dockerfile
      target: database-release
    restart: "no"
    env_file: .env.build
    environment:
      NODE_ENV: production
    depends_on:
      app-pgdog:
        condition: service_started
```

Add this dependency to both `nextjs` and `playwright`:

```yaml
      db-release:
        condition: service_completed_successfully
```

- [ ] **Step 3: Define the complete deploy environment contract**

Replace `docker/.env.deploy.example` with one complete deploy environment
template. Use the exact variable names consumed by the included service models:

```dotenv
PGDOG_RUST_LOG=info
APP_POSTGRES_USER=mihc
APP_POSTGRES_PASSWORD=replace-with-a-secret
APP_POSTGRES_DB=mihc

INNGEST_EVENT_KEY=replace-with-an-event-key
INNGEST_SIGNING_KEY=replace-with-a-signing-key
INNGEST_POSTGRES_URI=postgresql://inngest:replace-with-a-secret@inngest-postgres:5432/inngest?sslmode=disable
INNGEST_REDIS_URI=redis://inngest-redis:6379
INNGEST_POLL_INTERVAL=60
INNGEST_QUEUE_WORKERS=100
INNGEST_RETRY_INTERVAL=1
INNGEST_TICK=150
INNGEST_LOG_LEVEL=info
INNGEST_JSON=true
INNGEST_VERBOSE=false
INNGEST_POSTGRES_DB=inngest
INNGEST_POSTGRES_USER=inngest
INNGEST_POSTGRES_PASSWORD=replace-with-a-secret

PGADMIN_DEFAULT_EMAIL=admin@example.com
PGADMIN_DEFAULT_PASSWORD=replace-with-a-secret

DATABASE_URL=postgresql://mihc:change-me@app-pgdog:6432/mihc?sslmode=disable
NEXT_PUBLIC_APP_URL=https://sanity.example.com
BETTER_AUTH_SECRET=generate-a-long-random-secret
BETTER_AUTH_URL=https://sanity.example.com
INNGEST_BASE_URL=http://inngest:8288

PROD_MAINTAINER_NAME=Production Maintainer
PROD_MAINTAINER_EMAIL=maintainer@example.com
PROD_MAINTAINER_PASSWORD=replace-with-a-secret
```

The file is a template only; `docker/.env.deploy` remains ignored. Replace
`change-me` in `DATABASE_URL` with the same value used for
`APP_POSTGRES_PASSWORD`.

- [ ] **Step 4: Add the deploy release service and required-variable checks**

In `docker/compose.deploy.yml`, first remove each include entry's
service-local `env_file`. The deploy model must resolve all included-service
variables from `--env-file docker/.env.deploy`; the local and build Compose
models continue using service-local `.env` files.

Then add:

```yaml
  db-release:
    image: ghcr.io/markvalenzuela-mmdc/mihc-nextjs-db-release:latest
    restart: "no"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL is required}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRET is required}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL:?BETTER_AUTH_URL is required}
      PROD_MAINTAINER_NAME: ${PROD_MAINTAINER_NAME:?PROD_MAINTAINER_NAME is required}
      PROD_MAINTAINER_EMAIL: ${PROD_MAINTAINER_EMAIL:?PROD_MAINTAINER_EMAIL is required}
      PROD_MAINTAINER_PASSWORD: ${PROD_MAINTAINER_PASSWORD:?PROD_MAINTAINER_PASSWORD is required}
    depends_on:
      app-pgdog:
        condition: service_started
```

Replace `nextjs`'s `env_file: .env.build` with explicit required runtime
variables:

```yaml
    environment:
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL is required}
      NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:?NEXT_PUBLIC_APP_URL is required}
      BETTER_AUTH_SECRET: ${BETTER_AUTH_SECRET:?BETTER_AUTH_SECRET is required}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL:?BETTER_AUTH_URL is required}
      INNGEST_EVENT_KEY: ${INNGEST_EVENT_KEY:?INNGEST_EVENT_KEY is required}
      INNGEST_BASE_URL: ${INNGEST_BASE_URL:?INNGEST_BASE_URL is required}
      INNGEST_SIGNING_KEY: ${INNGEST_SIGNING_KEY:?INNGEST_SIGNING_KEY is required}
```

Replace `playwright`'s `env_file: .env.build` with:

```yaml
    environment:
      DATABASE_URL: ${DATABASE_URL:?DATABASE_URL is required}
      INNGEST_BASE_URL: ${INNGEST_BASE_URL:?INNGEST_BASE_URL is required}
      INNGEST_EVENT_KEY: ${INNGEST_EVENT_KEY:?INNGEST_EVENT_KEY is required}
      INNGEST_SIGNING_KEY: ${INNGEST_SIGNING_KEY:?INNGEST_SIGNING_KEY is required}
      INNGEST_DEV: "0"
      PORT: "3939"
```

Add the successful release dependency to both application services:

```yaml
      db-release:
        condition: service_completed_successfully
```

- [ ] **Step 5: Make the Just deploy command load the deploy environment**

Change the `deploy` recipe in `commands/docker.just` to:

```just
# Start or stop deploy Docker Compose services
deploy action="up":
    @docker compose --env-file "{{ justfile_directory() }}/docker/.env.deploy" -f "{{ justfile_directory() }}/docker/compose.deploy.yml" {{action}} {{if action == "up" { "-d" } else { "" }}}
```

The ignored `docker/.env.deploy` file is the CLI path. Coolify continues
injecting the same variables through its environment configuration.

- [ ] **Step 6: Verify both validation layers**

Run without a deploy env file:

```bash
docker compose -f docker/compose.deploy.yml config
```

Expected: FAIL with a required-variable error.

Create ignored `docker/.env.deploy` from the template, replace every example
secret locally, then run:

```bash
docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml config --quiet
```

Expected: exit code 0.

Verify the local production-image stack:

```bash
docker compose --env-file docker/.env.build -f docker/compose.build.yml config --quiet
```

Expected: exit code 0 and both application services depend on `db-release`
with `service_completed_successfully`.

- [ ] **Step 7: Commit Compose release gating**

```bash
git add docker/compose.build.yml docker/compose.deploy.yml docker/.env.build.example docker/.env.deploy.example commands/docker.just
git commit -m "feat(deploy): gate apps on database release"
```

---

### Task 7: Document deployment, retry, and rollback operations

**Files:**

- Modify: `README.md`
- Modify: `docker/README.md`
- Modify: `docs/containerized-infrastructure.md`
- Modify: `docs/docker-commands.md`

- [ ] **Step 1: Update the root command guide**

In `README.md`:

- describe `just db seed` as development fixture seeding;
- add `just db release` as the production-only migrate/bootstrap command;
- state that normal deploys invoke it through `db-release`;
- warn that `just db reset` is prohibited against production; and
- list the three `PROD_MAINTAINER_*` variables in the environment section.

Use this command-table row:

```markdown
| db | `just db release` | Production only: apply Drizzle migrations and bootstrap the maintainer plus Smoke Testing apps |
```

- [ ] **Step 2: Document the release service**

In `docker/README.md`, add a `Database release` section containing:

```markdown
## Database release

Deploy and production-image Compose stacks run `db-release` once before
Next.js and Playwright. The service validates production configuration, applies
committed Drizzle migrations, and idempotently bootstraps the configured
maintainer plus the Smoke Testing app catalog. Application services start only
after the release container exits successfully.
```

- [ ] **Step 3: Add the production operator runbook**

In `docs/containerized-infrastructure.md`, document:

1. Copy `docker/.env.deploy.example` to ignored `docker/.env.deploy`.
2. Replace all example credentials with deployment secrets.
3. Back up the production database.
4. Validate configuration:

```bash
docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml config --quiet
```

5. Deploy:

```bash
docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml up -d
```

6. Inspect release logs:

```bash
docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml logs db-release
```

7. After correcting a failed configuration or database dependency, retry only
   the release service:

```bash
docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml run --rm db-release
docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml up -d
```

State explicitly:

- the password initializes a missing maintainer but does not rotate an existing
  password;
- production bootstrap never loads synthetic histories or profiles;
- rollback the application image independently;
- correct schema problems with a new forward Drizzle migration; and
- never run `just db reset` against production.

- [ ] **Step 4: Align the Docker command reference**

In `docs/docker-commands.md`:

- list `db-release` among deploy services;
- add `--env-file docker/.env.deploy` to direct deploy commands;
- explain `service_completed_successfully`;
- add the release log and retry commands from the runbook; and
- clarify that `just docker build` uses non-production values from
  `docker/.env.build` to test the production image path.

- [ ] **Step 5: Validate documentation commands and links**

Run:

```bash
just
just db
just docker
git diff --check
```

Expected: command listings include `db release`; no Markdown link or whitespace
errors are introduced.

- [ ] **Step 6: Commit operator documentation**

```bash
git add README.md docker/README.md docs/containerized-infrastructure.md docs/docker-commands.md
git commit -m "docs(deploy): add database release runbook"
```

---

### Task 8: Run the complete release verification

**Files:**

- Verify only; fix only failures caused by this implementation.

- [ ] **Step 1: Run focused database tests**

```bash
cd nextjs
pnpm test -- \
  __tests__/unit/lib/drizzle/seed/seed-apps.test.ts \
  __tests__/unit/lib/drizzle/seed/production-config.test.ts \
  __tests__/unit/scripts/release-database.test.ts \
  __tests__/integration/production-bootstrap.test.ts \
  __tests__/integration/auth-seed.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the complete Next.js quality suite**

From the repository root:

```bash
just check lint
just check typecheck
just dev test
just app build
```

Expected: PASS, or document only pre-existing failures with command output.

- [ ] **Step 3: Validate Compose and Docker targets**

```bash
docker compose --env-file docker/.env.build -f docker/compose.build.yml config --quiet
docker compose --env-file docker/.env.deploy -f docker/compose.deploy.yml config --quiet
docker build --target database-release -f nextjs/Dockerfile -t mihc-nextjs-db-release:verification .
docker build -f nextjs/Dockerfile -t mihc-nextjs:verification .
```

Expected: all commands exit 0.

- [ ] **Step 4: Verify a production-like fresh start**

Using disposable local Docker volumes and non-production credentials:

```bash
docker compose --env-file docker/.env.build -f docker/compose.build.yml up --build --wait
docker compose --env-file docker/.env.build -f docker/compose.build.yml ps
docker compose --env-file docker/.env.build -f docker/compose.build.yml logs db-release
```

Expected:

- `db-release` exits with code 0;
- logs show migrations before bootstrap;
- logs name the maintainer email and four apps but never the password; and
- Next.js and Playwright become healthy/running only after release success.

Run the same `up --wait` command again. Expected: release succeeds without
duplicate-key errors and existing operational rows remain present.

- [ ] **Step 5: Verify the final diff**

```bash
git status --short --branch
git diff origin/main...HEAD --check
git diff origin/main...HEAD --stat
```

Confirm:

- only the planned database, Docker, CI, command, test, and documentation files
  changed;
- no `.env` file or secret is tracked;
- no synthetic fixture is included in production bootstrap;
- no Drizzle SQL migration was fabricated; and
- the approved design remains present.

- [ ] **Step 6: Commit any verification-only corrections**

If verification required scoped corrections:

```bash
git add nextjs/lib/drizzle/seed/seed-apps.ts nextjs/lib/drizzle/seed/production-config.ts nextjs/lib/drizzle/seed/seed-production.ts nextjs/scripts/release-database.ts nextjs/scripts/setup-test-db.ts nextjs/package.json nextjs/Dockerfile commands/db.just commands/docker.just docker/compose.build.yml docker/compose.deploy.yml docker/.env.build.example docker/.env.deploy.example .github/workflows/build-nextjs.yml README.md docker/README.md docs/containerized-infrastructure.md docs/docker-commands.md nextjs/__tests__/unit/lib/drizzle/seed/seed-apps.test.ts nextjs/__tests__/unit/lib/drizzle/seed/production-config.test.ts nextjs/__tests__/unit/scripts/release-database.test.ts nextjs/__tests__/integration/production-bootstrap.test.ts
git commit -m "fix(deploy): correct database release verification"
```

If no correction was required, do not create an empty commit.
