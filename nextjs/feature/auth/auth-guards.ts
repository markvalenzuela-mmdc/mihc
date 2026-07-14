import { redirect } from "next/navigation";

import { getCurrentUser } from "@/feature/auth/actions/auth.action";
import { CurrentUser } from "./types/auth.types";

export async function requireAuthenticated(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return user;
}
