import { auth } from "@/lib/better-auth/auth";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export type CurrentUser = NonNullable<AuthSession>["user"];
