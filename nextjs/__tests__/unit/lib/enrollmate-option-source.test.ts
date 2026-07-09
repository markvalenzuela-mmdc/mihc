import { describe, expect, it } from "vitest";

import { ENROLLMATE_OPTION_SET_KEYS } from "@/lib/drizzle/schema/enrollmate-catalog";
import { loadEnrollmateCatalogSource } from "@/lib/drizzle/seed/seed-enrollmate-catalog";

describe("loadEnrollmateCatalogSource", () => {
  it("maps exact checked-in UAT option counts into generic sets", () => {
    const source = loadEnrollmateCatalogSource();
    const options = (key: string) =>
      source.optionSets.find((set) => set.key === key)?.options;

    expect(source.version).toBe("1.8.3");
    expect(source.referenceDate).toBe("2026-07-08");
    expect(options(ENROLLMATE_OPTION_SET_KEYS.nationality)).toHaveLength(136);
    expect(options(ENROLLMATE_OPTION_SET_KEYS.religion)).toHaveLength(92);
    expect(options(ENROLLMATE_OPTION_SET_KEYS.country)).toHaveLength(196);
    expect(options(ENROLLMATE_OPTION_SET_KEYS.province)).toHaveLength(86);
    expect(options(ENROLLMATE_OPTION_SET_KEYS.municipality)).toHaveLength(14);
    expect(options(ENROLLMATE_OPTION_SET_KEYS.barangay)).toHaveLength(35);
    expect(
      options(ENROLLMATE_OPTION_SET_KEYS.barangay)?.map(
        ({ submittedValue }) => submittedValue,
      ),
    ).toContain("Tandang Kutyo (Pob.)");
    expect(options(ENROLLMATE_OPTION_SET_KEYS.bachelorMajor)).toHaveLength(2);
    expect(
      options(ENROLLMATE_OPTION_SET_KEYS.bachelorSpecialization),
    ).toHaveLength(8);
    expect(
      options(ENROLLMATE_OPTION_SET_KEYS.discoveryChannels),
    ).toHaveLength(11);
    expect(
      options(ENROLLMATE_OPTION_SET_KEYS.bachelorStudyReasons),
    ).toHaveLength(8);
    expect(source.optionSets.map(({ key }) => key)).toEqual(
      Object.values(ENROLLMATE_OPTION_SET_KEYS),
    );
  });

  it("keeps identical field answers in field-specific sets", () => {
    const source = loadEnrollmateCatalogSource();
    const byKey = new Map(source.optionSets.map((set) => [set.key, set]));

    expect(
      byKey
        .get(ENROLLMATE_OPTION_SET_KEYS.bachelorMedicalCondition)
        ?.options.map(({ submittedValue }) => submittedValue),
    ).toEqual(["Yes", "No"]);
    expect(
      byKey
        .get(ENROLLMATE_OPTION_SET_KEYS.microcredentialDeviceAccess)
        ?.options.map(({ submittedValue }) => submittedValue),
    ).toEqual(["Yes", "No"]);
    expect(ENROLLMATE_OPTION_SET_KEYS.bachelorMedicalCondition).not.toBe(
      ENROLLMATE_OPTION_SET_KEYS.microcredentialDeviceAccess,
    );
  });

  it("maps only the captured dependency edges", () => {
    const source = loadEnrollmateCatalogSource();

    expect(
      source.dependencies.filter(
        ({ type }) => type === "major_to_specialization",
      ),
    ).toHaveLength(8);
    expect(
      source.dependencies.filter(
        ({ type }) => type === "province_to_municipality",
      ),
    ).toHaveLength(14);
    expect(
      source.dependencies.filter(
        ({ type }) => type === "municipality_to_barangay",
      ),
    ).toHaveLength(36);
  });

  it("contains no duplicate submitted values within a set", () => {
    const source = loadEnrollmateCatalogSource();

    for (const set of source.optionSets) {
      const values = set.options.map(({ submittedValue }) => submittedValue);
      expect(new Set(values).size, set.key).toBe(values.length);
    }
  });
});
