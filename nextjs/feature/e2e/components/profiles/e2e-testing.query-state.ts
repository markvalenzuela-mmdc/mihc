import { createLoader, parseAsString } from "nuqs/server";

export const profileParamKey = "profile" as const;

export const profileSearchParams = {
  [profileParamKey]: parseAsString.withDefault(""),
};

export const loadProfileSearchParams = createLoader(profileSearchParams);
