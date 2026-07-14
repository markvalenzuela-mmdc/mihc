import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import type { E2eProfileFixture } from "../types/e2e-profile-form.types";

const APPROVED_FIXTURE_DIRECTORY = resolve(
  process.cwd(),
  "feature/e2e/fixtures/approved",
);

const MIME_TYPES: Record<string, string> = {
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
};

function getMimeType(filename: string) {
  const extension = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[extension] ?? "application/octet-stream";
}

function readFixtureDirectory(
  directory: string,
  fixtures: E2eProfileFixture[],
) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;

    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      readFixtureDirectory(absolutePath, fixtures);
      continue;
    }
    if (!entry.isFile()) continue;

    const relativePath = relative(APPROVED_FIXTURE_DIRECTORY, absolutePath)
      .split("\\")
      .join("/");
    const stats = statSync(absolutePath);
    fixtures.push({
      fixtureUri: `approved-e2e-fixture://${encodeURIComponent(relativePath)}`,
      filename: entry.name,
      mimeType: getMimeType(entry.name),
      sizeBytes: stats.size,
    });
  }
}

export function getApprovedE2eProfileFixtures(): E2eProfileFixture[] {
  const fixtures: E2eProfileFixture[] = [];
  readFixtureDirectory(APPROVED_FIXTURE_DIRECTORY, fixtures);
  return fixtures.sort((left, right) =>
    left.fixtureUri.localeCompare(right.fixtureUri),
  );
}
