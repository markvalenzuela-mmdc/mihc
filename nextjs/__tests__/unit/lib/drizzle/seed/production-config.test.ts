import { describe, expect, it } from "vitest";

import { getProductionSeedConfig } from "@/lib/drizzle/seed/production-config";

const validEnvironment = {
  PROD_MAINTAINER_NAME: "Production Maintainer",
  PROD_MAINTAINER_EMAIL: " Maintainer@Example.com ",
  PROD_MAINTAINER_PASSWORD: "safe-password-123",
};

describe("getProductionSeedConfig", () => {
  it("trims the name and normalizes the email", () => {
    expect(getProductionSeedConfig(validEnvironment)).toEqual({
      name: "Production Maintainer",
      email: "maintainer@example.com",
      password: "safe-password-123",
    });
  });

  it.each([
    "PROD_MAINTAINER_NAME",
    "PROD_MAINTAINER_EMAIL",
    "PROD_MAINTAINER_PASSWORD",
  ] as const)("rejects a missing %s", (key) => {
    const environment: Record<string, string | undefined> = {
      ...validEnvironment,
    };
    delete environment[key];

    expect(() => getProductionSeedConfig(environment)).toThrow();
  });

  it("rejects an invalid email", () => {
    expect(() =>
      getProductionSeedConfig({
        ...validEnvironment,
        PROD_MAINTAINER_EMAIL: "not-an-email",
      }),
    ).toThrow();
  });

  it.each(["short", "x".repeat(129)])(
    "rejects a password outside Better Auth's 8-128 character policy",
    (password) => {
      expect(() =>
        getProductionSeedConfig({
          ...validEnvironment,
          PROD_MAINTAINER_PASSWORD: password,
        }),
      ).toThrow();
    },
  );
});
