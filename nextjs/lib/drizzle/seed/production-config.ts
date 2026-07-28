import { z } from "zod";

const productionSeedConfigSchema = z.object({
  name: z.string().trim().min(1, "PROD_MAINTAINER_NAME is required."),
  email: z
    .email("PROD_MAINTAINER_EMAIL must be a valid email address.")
    .transform((email) => email.trim().toLowerCase()),
  password: z
    .string()
    .min(8, "PROD_MAINTAINER_PASSWORD must contain at least 8 characters.")
    .max(128, "PROD_MAINTAINER_PASSWORD must contain at most 128 characters."),
});

export type ProductionSeedConfig = z.infer<typeof productionSeedConfigSchema>;

export function getProductionSeedConfig(
  environment: Record<string, string | undefined> = process.env,
): ProductionSeedConfig {
  return productionSeedConfigSchema.parse({
    name: environment.PROD_MAINTAINER_NAME,
    email: environment.PROD_MAINTAINER_EMAIL?.trim(),
    password: environment.PROD_MAINTAINER_PASSWORD,
  });
}
