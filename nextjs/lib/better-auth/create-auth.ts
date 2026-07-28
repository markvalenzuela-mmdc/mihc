import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import * as schema from "@/lib/drizzle/schema";

type AuthDatabase = Parameters<typeof drizzleAdapter>[0];

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
