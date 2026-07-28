import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { authAccount, authUser } from "../schema";
import type * as schema from "../schema";
import type { ProductionSeedConfig } from "./production-config";
import { seedSmokeTestingApps } from "./seed-apps";

type ProductionSeedDatabase = NodePgDatabase<typeof schema>;
type ProductionSeedTransaction = Parameters<
  Parameters<ProductionSeedDatabase["transaction"]>[0]
>[0];
type ProductionSeedExecutor =
  | ProductionSeedDatabase
  | ProductionSeedTransaction;

async function findMaintainer(
  db: ProductionSeedExecutor,
  email: string,
) {
  const [maintainer] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);

  return maintainer;
}

async function findMaintainerCredentialAccounts(
  db: ProductionSeedExecutor,
  maintainerId: string,
) {
  return db
    .select({
      accountId: authAccount.accountId,
      password: authAccount.password,
    })
    .from(authAccount)
    .where(
      and(
        eq(authAccount.userId, maintainerId),
        eq(authAccount.providerId, "credential"),
      ),
    );
}

function assertValidMaintainerCredentialAccount(
  maintainerId: string,
  credentialAccounts: Awaited<
    ReturnType<typeof findMaintainerCredentialAccounts>
  >,
) {
  const [credentialAccount] = credentialAccounts;
  const isValid =
    credentialAccounts.length === 1 &&
    credentialAccount?.accountId === maintainerId &&
    Boolean(credentialAccount.password);

  if (isValid) return;

  throw new Error(
    "The production maintainer user exists without exactly one usable " +
      "Better Auth credential account. No maintainer fields, passwords, or " +
      "app records were changed. Restore the account through a supported " +
      "Better Auth password or account recovery flow, then retry the " +
      "database release. The release process never creates or resets a " +
      "password for an existing user.",
  );
}

async function createMaintainer(
  db: ProductionSeedExecutor,
  config: ProductionSeedConfig,
) {
  const { createBetterAuth } = await import("@/lib/better-auth/create-auth");
  const betterAuthUrl = process.env.BETTER_AUTH_URL;

  if (!betterAuthUrl) {
    throw new Error("BETTER_AUTH_URL is required to seed the maintainer.");
  }

  await createBetterAuth(db).api.signUpEmail({
    body: config,
    headers: new Headers({ host: new URL(betterAuthUrl).host }),
  });
}

export async function seedProductionDatabase(
  db: ProductionSeedExecutor,
  config: ProductionSeedConfig,
) {
  let maintainer = await findMaintainer(db, config.email);

  if (!maintainer) {
    await createMaintainer(db, config);
    maintainer = await findMaintainer(db, config.email);
  }

  if (!maintainer) {
    throw new Error("Better Auth did not create the production maintainer.");
  }

  const maintainerId = maintainer.id;
  const credentialAccounts = await findMaintainerCredentialAccounts(
    db,
    maintainerId,
  );
  assertValidMaintainerCredentialAccount(maintainerId, credentialAccounts);

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
