import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { e2eSteps } from "../schema";
import type * as schema from "../schema";

export const e2eStepDefinitions = [
  { id: "new", label: "New", description: "Profile is newly created and awaiting initial guidance review.", sortOrder: 1 },
  { id: "guidance_needed", label: "Guidance needed", description: "Profile requires guidance or admissions follow-up before validation.", sortOrder: 2 },
  { id: "validated", label: "Validated", description: "Profile details have passed validation and can move into verification.", sortOrder: 3 },
  { id: "verification", label: "Verification", description: "Profile is under enrollment or document verification.", sortOrder: 4 },
  { id: "enrollment_confirmation", label: "Enrollment confirmation", description: "Profile is ready for enrollment confirmation checks.", sortOrder: 5 },
  { id: "for_payment", label: "For payment", description: "Profile is ready for payment instructions or collection.", sortOrder: 6 },
  { id: "payment_verification", label: "Payment verification", description: "Payment evidence is being verified.", sortOrder: 7 },
  { id: "completed", label: "Completed", description: "Profile has completed the enrollment workflow.", sortOrder: 8 },
];

export async function seedE2eSteps(tx: NodePgDatabase<typeof schema>) {
  const messages: string[] = [];

  for (const step of e2eStepDefinitions) {
    await tx.insert(e2eSteps).values(step).onConflictDoUpdate({
      target: e2eSteps.id,
      set: {
        label: step.label,
        description: step.description,
        sortOrder: step.sortOrder,
      },
    });
    messages.push(`Seeded E2E step: ${step.label}`);
  }

  return messages;
}
