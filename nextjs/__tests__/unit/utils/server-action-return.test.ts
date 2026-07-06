import { describe, expect, it } from "vitest";

import { err, ok } from "@/utils/server-action-return";

describe("server action return helpers", () => {
  it("returns the ok discriminant with data", () => {
    expect(ok({ id: "run-1" })).toEqual({
      ok: true,
      data: { id: "run-1" },
    });
  });

  it("returns the err discriminant with error data", () => {
    expect(err("internalServerError")).toEqual({
      ok: false,
      error: "internalServerError",
    });
  });
});
