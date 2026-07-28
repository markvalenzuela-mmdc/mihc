import { createBetterAuth } from "@/lib/better-auth/create-auth";
import { getDb } from "@/lib/drizzle/db";

export const auth = createBetterAuth(getDb());
