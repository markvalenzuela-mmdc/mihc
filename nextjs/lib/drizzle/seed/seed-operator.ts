import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { authUser } from "../schema";
import type * as schema from "../schema";

import { seedSmokeTestingApps } from "./seed-apps";

export const currentOperator = {
  id: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3",
  name: "Jamie Villanueva",
  email: "jamie.villanueva@mmdc.mcl.edu.ph",
  emailVerified: true,
};

export async function seedOperatorAndApps(tx: NodePgDatabase<typeof schema>) {
  const messages: string[] = [];

  await tx
    .insert(authUser)
    .values(currentOperator)
    .onConflictDoUpdate({
      target: authUser.id,
      set: {
        name: currentOperator.name,
        email: currentOperator.email,
        emailVerified: currentOperator.emailVerified,
      },
    });
  messages.push(`Seeded operator: ${currentOperator.email}`);

  messages.push(...await seedSmokeTestingApps(tx, currentOperator.id));

  return messages;
}
