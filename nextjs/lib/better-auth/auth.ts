import { createBetterAuth } from "@/lib/better-auth/create-auth";
import { getDb } from "@/lib/drizzle/db";

// The application singleton is bound to the cached runtime database client.
// Startup bootstrap code uses createBetterAuth() with its release-owned client.
export const auth = createBetterAuth(getDb());
