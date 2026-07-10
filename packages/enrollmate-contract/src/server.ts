import { createHash } from "node:crypto";

import source from "./definitions/enrollmate-form-fields.json";

export function getEnrollmateDefinitionHash() {
  return createHash("sha256").update(JSON.stringify(source)).digest("hex");
}
