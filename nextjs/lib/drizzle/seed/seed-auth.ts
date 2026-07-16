import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import * as schema from "../schema";
import { authUser } from "../schema";

export const developmentAuthUser = {
  name: "Maintainer",
  email: "maintainer@example.com",
  password: "password123",
} as const;

export async function seedAuthUser(
  db: NodePgDatabase<typeof schema>,
): Promise<string[]> {
  if (process.env.NODE_ENV === "production") {
    return ["Skipped development auth user seed in production."];
  }

  const [existingUser] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, developmentAuthUser.email))
    .limit(1);

  if (existingUser) {
    return [
      `Auth user already exists: ${developmentAuthUser.email}`,
      `Development login password: ${developmentAuthUser.password}`,
    ];
  }

  const { auth } = await import("@/lib/better-auth/auth");

  await auth.api.signUpEmail({
    body: developmentAuthUser,
    headers: new Headers({ host: "localhost" }),
  });

  return [
    `Seeded auth user: ${developmentAuthUser.email}`,
    `Development login password: ${developmentAuthUser.password}`,
  ];
}
