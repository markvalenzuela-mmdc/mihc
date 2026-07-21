import type { EnrollmateOption } from "./types";

export function getAvailableEnrollmateGuardianAssignments(
  options: readonly EnrollmateOption[],
  values: Record<string, unknown>,
) {
  return options.filter(({ value }) => {
    if (value === "Father") return values.fthrDeceased === "Living";
    if (value === "Mother") return values.mthrDeceased === "Living";
    return value === "Others";
  });
}
