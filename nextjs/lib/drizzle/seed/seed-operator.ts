import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { apps, users } from "../schema";
import type * as schema from "../schema";

export const currentOperator = {
  id: "8f0c506c-b865-42fc-992d-6eaeea7bf4c3",
  name: "Jamie Villanueva",
  email: "jamie.villanueva@mmdc.mcl.edu.ph",
};

const smokeApps = [
  { id: "website", name: "Website", description: "Public marketing and admissions website" },
  { id: "enrollmate", name: "Enrollmate", description: "Student enrollment workflow" },
  { id: "enrollmate-clp", name: "Enrollmate CLP", description: "CLP enrollment support surface" },
  { id: "n8n", name: "Self-hosted n8n", description: "Automation workflow instance" },
];

export async function seedOperatorAndApps(tx: NodePgDatabase<typeof schema>) {
  const messages: string[] = [];

  await tx
    .insert(users)
    .values(currentOperator)
    .onConflictDoUpdate({
      target: users.id,
      set: { name: currentOperator.name, email: currentOperator.email },
    });
  messages.push(`Seeded operator: ${currentOperator.email}`);

  for (const app of smokeApps) {
    const values = {
      ...app,
      createdBy: currentOperator.id,
      updatedBy: currentOperator.id,
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
