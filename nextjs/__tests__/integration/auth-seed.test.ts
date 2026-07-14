import { describe, expect, it } from "vitest";

import { developmentAuthUser } from "@/lib/drizzle/seed/seed-auth";
import { useIntegrationTestDatabase } from "./helpers/test-db";

describe("seeded BetterAuth development user", () => {
  useIntegrationTestDatabase();

  it("can sign in with the documented local credentials", async () => {
    const { auth } = await import("@/lib/better-auth/auth");

    const result = await auth.api.signInEmail({
      body: {
        email: developmentAuthUser.email,
        password: developmentAuthUser.password,
      },
      headers: new Headers({ host: "localhost" }),
    });

    expect(result.user.email).toBe(developmentAuthUser.email);
  });
});
