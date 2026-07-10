export type EnrollmateFlowType = "bachelors" | "microcredentials";

export type EnrollmateFieldType =
  | "text"
  | "textarea"
  | "email"
  | "tel"
  | "date"
  | "select"
  | "combobox"
  | "checkbox"
  | "file";

export type EnrollmateOption = {
  label: string;
  value: string;
};

export type EnrollmateConditionValue = string | boolean;

export type EnrollmateConditionalRule = {
  field: string;
  equalsAny: EnrollmateConditionValue[];
};

export type EnrollmateOptionSource =
  | { kind: "inline" }
  | { kind: "reusable"; optionSet: string }
  | { kind: "dependent"; field: string }
  | { kind: "cascade" }
  | { kind: "external" };

export type EnrollmateCascade = {
  dependsOn?: string;
  triggers?: string[];
};

export type EnrollmateAutomation = {
  isCascadeParent?: boolean;
  triggers?: string[];
  exampleOptionsByParent?: Record<string, string[]>;
};

export type EnrollmateField = {
  id: string;
  name: string;
  label: string;
  type: EnrollmateFieldType;
  required: boolean;
  description?: string;
  htmlInputType?: string;
  placeholder?: string;
  placeholderValue?: string;
  defaultValue?: EnrollmateConditionValue;
  options: EnrollmateOption[];
  optionsByDependency: Record<string, EnrollmateOption[]>;
  optionSource?: EnrollmateOptionSource;
  conditionalOn: EnrollmateConditionalRule | null;
  requiredWhenConditionMet: boolean;
  cascade?: EnrollmateCascade;
  automation?: EnrollmateAutomation;
  acceptedFormats: string[];
  maxSizeBytes: number | null;
};

export type EnrollmateSection = {
  label: string;
  description?: string;
  notes?: string;
  prefix?: string;
  type?: "checkboxGroup";
  required?: boolean;
  fields: EnrollmateField[];
};

export type EnrollmateStep = {
  step: number;
  title: string;
  sections: EnrollmateSection[];
};

export type EnrollmateFlowDefinition = {
  title: string;
  endpoint: string;
  steps: EnrollmateStep[];
};

export type EnrollmateDefinition = Record<
  EnrollmateFlowType,
  EnrollmateFlowDefinition
>;

export type ProfileOperationalData = {
  payment?: Record<string, unknown>;
  studyBuddy?: Record<string, unknown>;
  additionalInfo?: Record<string, unknown>;
  disclosures?: Record<string, unknown>;
  systemInfo?: Record<string, unknown>;
};
