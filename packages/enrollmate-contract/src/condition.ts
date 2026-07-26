import type { EnrollmateConditionalRule } from "./types";

export function isEnrollmateConditionMet(
  condition: readonly EnrollmateConditionalRule[] | null,
  values: Record<string, unknown>,
) {
  if (!condition) return true;

  return condition.every((rule) => {
    const value = values[rule.field];
    if (typeof value !== "string" && typeof value !== "boolean") return false;
    if (rule.equalsAny !== undefined) return rule.equalsAny.includes(value);
    return !rule.notEqualsAny.includes(value);
  });
}
