import source from "./definitions/enrollmate-form-fields.json";
import { parseEnrollmateDefinition } from "./form-definition.schema";
import { buildEnrollmateValidator } from "./form-data.schema";
import type { EnrollmateDefinition, EnrollmateFlowDefinition, EnrollmateFlowType } from "./types";

export const enrollmateDefinition: EnrollmateDefinition =
  parseEnrollmateDefinition(source);

const validators = {
  bachelors: buildEnrollmateValidator(enrollmateDefinition.bachelors),
  microcredentials: buildEnrollmateValidator(enrollmateDefinition.microcredentials),
};

export function getEnrollmateFlowDefinition(
  flowType: EnrollmateFlowType,
): EnrollmateFlowDefinition {
  return enrollmateDefinition[flowType];
}

export function getEnrollmateValidator(flowType: EnrollmateFlowType) {
  return validators[flowType];
}
