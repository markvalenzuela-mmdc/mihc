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
