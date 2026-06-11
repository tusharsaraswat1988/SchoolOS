import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  managementTypeEnum,
  recognitionStatusEnum,
  schoolCategoryEnum,
  schoolTypeEnum,
} from "./enums";
import { schoolsTable } from "./schools";

export const schoolProfilesTable = pgTable(
  "school_profiles",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schoolsTable.id, { onDelete: "cascade" }),
    udiseCode: text("udise_code"),
    schoolCategory: schoolCategoryEnum("school_category"),
    schoolType: schoolTypeEnum("school_type"),
    managementType: managementTypeEnum("management_type"),
    managementCode: text("management_code"),
    address: text("address"),
    district: text("district"),
    block: text("block"),
    village: text("village"),
    pincode: text("pincode"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    mobile: text("mobile"),
    email: text("email"),
    website: text("website"),
    principalName: text("principal_name"),
    principalMobile: text("principal_mobile"),
    principalEmail: text("principal_email"),
    yearOfEstablishment: integer("year_of_establishment"),
    recognitionStatus: recognitionStatusEnum("recognition_status"),
    affiliationBoard: text("affiliation_board"),
    affiliationBoardName: text("affiliation_board_name"),
    affiliationNumber: text("affiliation_number"),
    mediumOfInstruction: text("medium_of_instruction"),
    languageGroups: jsonb("language_groups").$type<string[] | null>(),
    minoritySchoolFlag: boolean("minority_school_flag").notNull().default(false),
    residentialSchoolFlag: boolean("residential_school_flag").notNull().default(false),
    prePrimaryAvailable: boolean("pre_primary_available").notNull().default(false),
    lowestClass: text("lowest_class"),
    highestClass: text("highest_class"),
    streamsAvailable: jsonb("streams_available").$type<{
      science?: boolean;
      commerce?: boolean;
      arts?: boolean;
      vocational?: boolean;
    } | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
  },
  (table) => ({
    schoolUq: uniqueIndex("school_profiles_school_uq").on(table.schoolId),
    udiseCodeUq: uniqueIndex("school_profiles_udise_code_uq").on(table.udiseCode),
    schoolIdx: index("school_profiles_school_idx").on(table.schoolId),
  }),
);
