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

  return [`Seeded production maintainer: ${config.email}`, ...messages];
}
