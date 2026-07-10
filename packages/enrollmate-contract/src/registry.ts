import source from "./definitions/enrollmate-form-fields.json";
import { parseEnrollmateDefinition } from "./form-definition.schema";
import type { EnrollmateDefinition, EnrollmateFlowDefinition, EnrollmateFlowType } from "./types";

export const enrollmateDefinition: EnrollmateDefinition =
  parseEnrollmateDefinition(source);

export function getEnrollmateFlowDefinition(
  flowType: EnrollmateFlowType,
): EnrollmateFlowDefinition {
  return enrollmateDefinition[flowType];
}
