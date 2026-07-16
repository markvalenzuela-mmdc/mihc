import { auth } from "@/lib/better-auth/auth";
import { headers } from "next/headers";
import { CurrentUser } from "../types/auth.types";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });

  return session?.user ?? null;
}
