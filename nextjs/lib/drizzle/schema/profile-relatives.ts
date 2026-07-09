import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import {
  ENROLLMATE_OPTION_SET_KEYS,
  optionDependencyForeignKey,
  optionMembershipForeignKey,
} from "./enrollmate-catalog";
import { profileBachelorData } from "./profile-applications";

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

function sqlTextLiteral(value: string) {
  return sql.raw(`'${value.replaceAll("'", "''")}'`);
}

export const profileRelatedPeople = pgTable(
  "profile_related_people",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bachelorDataId: uuid("bachelor_data_id").notNull(),
    catalogVersionId: uuid("catalog_version_id").notNull(),
    role: text("role")
      .notNull()
      .$type<"father" | "mother" | "guardian">(),
    livingStatusOptionSetKey: text("living_status_option_set_key"),
    livingStatusOptionId: uuid("living_status_option_id"),
    givenName: text("given_name"),
    middleName: text("middle_name"),
    familyName: text("family_name"),
    suffixOptionSetKey: text("suffix_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.suffix),
    suffixOptionId: uuid("suffix_option_id"),
    birthdate: date("birthdate"),
    landline: text("landline"),
    mobile: text("mobile"),
    email: text("email"),
    occupation: text("occupation"),
    relationshipOptionSetKey: text("relationship_option_set_key"),
    relationshipOptionId: uuid("relationship_option_id"),
    relationshipOther: text("relationship_other"),
    ...auditColumns,
  },
  (table) => [
    unique().on(table.bachelorDataId, table.role),
    unique().on(table.id, table.catalogVersionId),
    foreignKey({
      columns: [table.bachelorDataId, table.catalogVersionId],
      foreignColumns: [
        profileBachelorData.id,
        profileBachelorData.catalogVersionId,
      ],
    }),
    optionMembershipForeignKey({
      name: "profile_related_people_living_status_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.livingStatusOptionSetKey,
      optionId: table.livingStatusOptionId,
    }),
    optionMembershipForeignKey({
      name: "profile_related_people_suffix_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.suffixOptionSetKey,
      optionId: table.suffixOptionId,
    }),
    optionMembershipForeignKey({
      name: "profile_related_people_relationship_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.relationshipOptionSetKey,
      optionId: table.relationshipOptionId,
    }),
    check(
      "profile_related_people_role_options_check",
      sql`(
        ${table.role} = 'father'
        and ${table.livingStatusOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorFatherLivingStatus)}
        and ${table.relationshipOptionSetKey} is null
        and ${table.relationshipOptionId} is null
      ) or (
        ${table.role} = 'mother'
        and ${table.livingStatusOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorMotherLivingStatus)}
        and ${table.relationshipOptionSetKey} is null
        and ${table.relationshipOptionId} is null
      ) or (
        ${table.role} = 'guardian'
        and ${table.livingStatusOptionSetKey} is null
        and ${table.livingStatusOptionId} is null
        and ${table.relationshipOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.bachelorGuardianRelationship)}
      )`,
    ),
    check(
      "profile_related_people_suffix_option_set_check",
      sql`${table.suffixOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.suffix)}`,
    ),
  ],
);

export const profileRelatedPersonAddresses = pgTable(
  "profile_related_person_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    relatedPersonId: uuid("related_person_id").notNull(),
    catalogVersionId: uuid("catalog_version_id").notNull(),
    addressType: text("address_type")
      .notNull()
      .$type<"current" | "permanent">(),
    sameAsApplicant: boolean("same_as_applicant").notNull().default(false),
    countryOptionSetKey: text("country_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.country),
    countryOptionId: uuid("country_option_id"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    provinceOptionSetKey: text("province_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.province),
    provinceOptionId: uuid("province_option_id"),
    municipalityOptionSetKey: text("municipality_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.municipality),
    municipalityOptionId: uuid("municipality_option_id"),
    barangayOptionSetKey: text("barangay_option_set_key")
      .notNull()
      .default(ENROLLMATE_OPTION_SET_KEYS.barangay),
    barangayOptionId: uuid("barangay_option_id"),
    zipCode: text("zip_code"),
    provinceMunicipalityDependencyType: text(
      "province_municipality_dependency_type",
    )
      .notNull()
      .default("province_to_municipality"),
    municipalityBarangayDependencyType: text(
      "municipality_barangay_dependency_type",
    )
      .notNull()
      .default("municipality_to_barangay"),
    ...auditColumns,
  },
  (table) => [
    unique().on(table.relatedPersonId, table.addressType),
    foreignKey({
      columns: [table.relatedPersonId, table.catalogVersionId],
      foreignColumns: [
        profileRelatedPeople.id,
        profileRelatedPeople.catalogVersionId,
      ],
    }),
    optionMembershipForeignKey({
      name: "profile_related_person_addresses_country_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.countryOptionSetKey,
      optionId: table.countryOptionId,
    }),
    optionMembershipForeignKey({
      name: "profile_related_person_addresses_province_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.provinceOptionSetKey,
      optionId: table.provinceOptionId,
    }),
    optionMembershipForeignKey({
      name: "profile_related_person_addresses_municipality_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.municipalityOptionSetKey,
      optionId: table.municipalityOptionId,
    }),
    optionMembershipForeignKey({
      name: "profile_related_person_addresses_barangay_option_fk",
      catalogVersionId: table.catalogVersionId,
      optionSetKey: table.barangayOptionSetKey,
      optionId: table.barangayOptionId,
    }),
    optionDependencyForeignKey({
      name: "profile_related_person_addresses_province_municipality_fk",
      catalogVersionId: table.catalogVersionId,
      dependencyType: table.provinceMunicipalityDependencyType,
      parentOptionId: table.provinceOptionId,
      childOptionId: table.municipalityOptionId,
    }),
    optionDependencyForeignKey({
      name: "profile_related_person_addresses_municipality_barangay_fk",
      catalogVersionId: table.catalogVersionId,
      dependencyType: table.municipalityBarangayDependencyType,
      parentOptionId: table.municipalityOptionId,
      childOptionId: table.barangayOptionId,
    }),
    check(
      "profile_related_person_addresses_type_check",
      sql`${table.addressType} in ('current', 'permanent')`,
    ),
    check(
      "profile_related_person_addresses_option_sets_check",
      sql`${table.countryOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.country)}
        and ${table.provinceOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.province)}
        and ${table.municipalityOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.municipality)}
        and ${table.barangayOptionSetKey} = ${sqlTextLiteral(ENROLLMATE_OPTION_SET_KEYS.barangay)}`,
    ),
  ],
);
