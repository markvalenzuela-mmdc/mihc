import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import * as schema from "@/lib/drizzle/schema";

type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

/**
 * Creates Better Auth on a caller-owned Drizzle client. The production
 * bootstrap uses this factory so its release-owned pool can be closed cleanly;
 * importing the singleton from auth.ts would create a separate cached pool.
 */
export function createBetterAuth(database: AuthDatabase) {
  return betterAuth({
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: {
        user: schema.authUser,
        session: schema.authSession,
        account: schema.authAccount,
        verification: schema.authVerification,
      },
    }),
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    emailAndPassword: {
      enabled: true,
    },
  });
}
