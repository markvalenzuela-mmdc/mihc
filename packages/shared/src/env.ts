import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// Load .env from the project root.
config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string(),
  S3_SECRET_KEY: z.string(),
  S3_BUCKET: z.string(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .transform((v) => v === "true")
    .default("true"),
  WEB_PORT: z.string().default("3000"),
  API_PORT: z.string().default("3001"),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten());
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();