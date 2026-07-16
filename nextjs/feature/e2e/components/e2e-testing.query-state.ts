import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";

export const profileParamKey = "profile" as const;
export const runParamKey = "run" as const;
export const runPageParamKey = "runPage" as const;
export const runLimitParamKey = "runLimit" as const;
export const stepParamKey = "step" as const;

export const profileSearchParams = {
  [profileParamKey]: parseAsString.withDefault(""),
};
export const runSearchParams = {
  [runParamKey]: parseAsString.withDefault(""),
};
export const runPaginationSearchParams = {
  [runPageParamKey]: parseAsInteger.withDefault(1),
};
export const runLimitSearchParams = {
  [runLimitParamKey]: parseAsInteger.withDefault(5),
};
export const stepSearchParams = {
  [stepParamKey]: parseAsInteger
    .withDefault(1)
    .withOptions({ clearOnDefault: false }),
};

export const loadProfileSearchParams = createLoader(profileSearchParams);
export const loadRunSearchParams = createLoader(runSearchParams);
export const loadRunPaginationSearchParams = createLoader(
  runPaginationSearchParams,
);
export const loadRunLimitSearchParams = createLoader(runLimitSearchParams);
export const loadStepSearchParams = createLoader(stepSearchParams);
