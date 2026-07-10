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

export type EnrollmateConditionalRule = {
  field: string;
  values: string[];
};

export type EnrollmateField = {
  id: string;
  name: string;
  label: string;
  type: EnrollmateFieldType;
  required: boolean;
  options: EnrollmateOption[];
  optionsByDependency: Record<string, EnrollmateOption[]>;
  conditionalOn: EnrollmateConditionalRule | null;
  acceptedFormats: string[];
  maxSizeBytes: number | null;
};

export type EnrollmateSection = {
  label: string;
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
