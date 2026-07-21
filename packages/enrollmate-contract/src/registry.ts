import source from "./definitions/enrollmate-form-fields.json" with { type: "json" };
import { parseEnrollmateDefinition } from "./form-definition.schema";
import {
  buildEnrollmateStepValidator,
  buildEnrollmateValidator,
} from "./form-data.schema";
import type {
  EnrollmateDefinition,
  EnrollmateFlowDefinition,
  EnrollmateFlowType,
  EnrollmateReusableOptionSets,
} from "./types";

export const enrollmateDefinition: EnrollmateDefinition =
  parseEnrollmateDefinition(source);

const validators = {
  bachelors: buildEnrollmateValidator(enrollmateDefinition.bachelors),
  microcredentials: buildEnrollmateValidator(enrollmateDefinition.microcredentials),
};

const stepValidators = {
  bachelors: new Map(
    enrollmateDefinition.bachelors.steps.map((step) => [
      step.step,
      buildEnrollmateStepValidator(enrollmateDefinition.bachelors, step),
    ]),
  ),
  microcredentials: new Map(
    enrollmateDefinition.microcredentials.steps.map((step) => [
      step.step,
      buildEnrollmateStepValidator(enrollmateDefinition.microcredentials, step),
    ]),
  ),
};

export function getEnrollmateFlowDefinition(
  flowType: EnrollmateFlowType,
): EnrollmateFlowDefinition {
  return enrollmateDefinition[flowType];
}

export function getEnrollmateReusableOptionSets(): EnrollmateReusableOptionSets {
  return Object.fromEntries(
    Object.entries(source.reusableOptionSets).map(([name, options]) => [
      name,
      options.map((option) => ({ ...option })),
    ]),
  );
}

export function getEnrollmateValidator(flowType: EnrollmateFlowType) {
  return validators[flowType];
}

export function getEnrollmateStepValidator(
  flowType: EnrollmateFlowType,
  stepNumber: number,
) {
  const validator = stepValidators[flowType].get(stepNumber);
  if (!validator) throw new Error(`Unknown ${flowType} step: ${stepNumber}`);
  return validator;
}
