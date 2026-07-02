import { createLoader, parseAsString } from "nuqs/server";

export const runParamKey = "run" as const;
export const appParamKey = "app" as const;

export const appSearchParams = {
  [appParamKey]: parseAsString.withDefault(""),
};
export const runSearchParams = {
  [runParamKey]: parseAsString.withDefault(""),
};

export const loadAppSearchParams = createLoader(appSearchParams);
export const loadRunSearchParams = createLoader(runSearchParams);