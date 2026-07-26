import type {
  EnrollmateConditionalRule,
  EnrollmateConditionValue,
} from "./types";

function isConditionValue(value: unknown): value is EnrollmateConditionValue {
  return typeof value === "string" || typeof value === "boolean";
}

export function isEnrollmateConditionMet(
  condition: readonly EnrollmateConditionalRule[] | null,
  values: Record<string, unknown>,
) {
  if (!condition) return true;

  return condition.every((rule) => {
    const value = values[rule.field];
    if (!isConditionValue(value)) return false;
    if (rule.equalsAny !== undefined) return rule.equalsAny.includes(value);
    return !rule.notEqualsAny.includes(value);
  });
}
