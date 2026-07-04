/**
 * Drizzle client on the shared app DB (via PgDog). Mirrors
 * nextjs/lib/drizzle/db.ts — same `drizzle-orm/node-postgres` + `pg` Pool +
 * `DATABASE_URL` — pointed at the same database from this separate package.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });
export type Db = typeof db;
