# Integration Pseudocode

## Next.js / Drizzle / node-postgres

```ts
// lib/db.ts — Drizzle client using PgBouncer connection pool
import { Pool, type PoolConfig } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// PgBouncer connection — transaction mode
const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL, // postgresql://mihc:mihc@localhost:6432/mihc_app
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

// Direct connection — for migrations, schema reads
const directConfig: PoolConfig = {
  connectionString: process.env.POSTGRES_DIRECT_URL, // postgresql://mihc:mihc@localhost:5432/mihc_app
  max: 5,
};

export const pool = new Pool(poolConfig);
export const directPool = new Pool(directConfig);
export const db = drizzle(pool);
```

## Inngest SDK configuration

```ts
// lib/inngest.ts — Inngest client
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "mihc",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
```

## Inngest route handler

```ts
// app/api/inngest/route.ts — Next.js App Router handler
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";

// Register functions here
const functions = [];

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
```

## Playwright environment setup

```ts
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    // PostgreSQL connection via PgBouncer for test data seeding
  },
  // globalSetup and globalTeardown for DB readiness checks
});
```

```ts
// playwright/global-setup.ts
import { Pool } from "pg";

async function globalSetup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  // Verify database connectivity
  await pool.query("SELECT 1");
  await pool.end();
}

export default globalSetup;
```

```ts
// playwright/global-teardown.ts
async function globalTeardown() {
  // Cleanup test data, close connections
}
```
