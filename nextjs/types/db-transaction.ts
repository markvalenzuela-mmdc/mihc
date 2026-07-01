import { getDb } from "@/lib/drizzle/db";

const db = getDb();

export type DrizzleTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type DbExecutor = typeof db | DrizzleTransaction;
