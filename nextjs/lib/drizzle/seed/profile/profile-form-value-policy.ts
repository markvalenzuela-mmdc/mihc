import type { EnrollmateField } from "@mihc/enrollmate-contract";

export function createProfileFormValueResolver(email: string) {
  return (field: EnrollmateField) => {
    const fieldName = field.name.toLowerCase();

    if (field.type === "email") return email;
    if (field.type === "date") return "1980-01-01";
    if (field.type === "tel") return "09170000000";
    if (fieldName.includes("country")) return "Philippines";
    if (fieldName.includes("province")) return "Rizal";
    if (fieldName.endsWith("givenname")) return "Maria";
    if (fieldName.endsWith("middlename")) return "Reyes";
    if (fieldName.endsWith("familyname")) return "Santos";
    if (fieldName.includes("addrline1")) return "123";
    if (fieldName.includes("addrline2")) {
      return "Rizal Street, San Isidro";
    }
    if (fieldName.includes("zipcode")) return "1920";
    if (fieldName.includes("citymun")) return "Tanay";
    if (fieldName.includes("barangay")) return "Sampaloc";
    if (fieldName.includes("occupation")) return "Operations Manager";

    const values: Record<string, string> = {
      birthplace: "Quezon City",
      studentCompany: "Mapúa Learning Solutions",
      otherStrand: "General Academic Strand",
      lastSchoolAttended: "Rizal National High School",
      medicalDiagnosisDescription: "Managed asthma",
      grdnOtherApplRelationship: "Aunt",
    };

    return values[field.name];
  };
}
