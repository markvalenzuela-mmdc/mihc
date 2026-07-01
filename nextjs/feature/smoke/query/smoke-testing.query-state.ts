import { createLoader, parseAsString } from "nuqs/server";
export const appParamKey = "app" as const;

export const appSearchParams = {
  [appParamKey]: parseAsString.withDefault(""),
};

export const loadAppSearchParams = createLoader(appSearchParams);
