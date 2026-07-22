function humanizeWords(value: string): string {
  return value.replaceAll("-", " ").replace(/\s+/g, " ").trim();
}

function capitalize(value: string): string {
  return value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);
}

export function formatSmokeTestName(testName: string): string {
  const name = testName.replace(/^smoke:\s*/i, "").trim();

  if (name.startsWith("/")) {
    return name
      .split("/")
      .filter(Boolean)
      .map((segment) =>
        humanizeWords(segment)
          .split(" ")
          .map(capitalize)
          .join(" "),
      )
      .join(" / ");
  }

  return capitalize(humanizeWords(name));
}

export function formatSmokeTestFile(testFile: string): string | null {
  const file = testFile.trim().replaceAll("\\", "/");
  if (!file) return null;

  const testsMarker = "/tests/";
  const testsIndex = file.lastIndexOf(testsMarker);
  if (testsIndex >= 0) {
    return file.slice(testsIndex + testsMarker.length);
  }

  if (file.startsWith("tests/")) {
    return file.slice("tests/".length);
  }

  if (file.startsWith("/") || /^[A-Za-z]:\//.test(file)) {
    return file.split("/").at(-1) ?? null;
  }

  return file.replace(/^\.\//, "");
}
