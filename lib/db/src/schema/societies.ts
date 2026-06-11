import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { entityStatusEnum } from "./enums";
import { platformsTable } from "./platforms";

export const societiesTable = pgTable(
  "societies",
  {
    id: serial("id").primaryKey(),
    platformId: integer("platform_id")
      .notNull()
      .references(() => platformsTable.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: entityStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    codePerPlatformUq: uniqueIndex("societies_platform_code_uq").on(
      table.platformId,
      table.code,
    ),
    platformIdx: index("societies_platform_idx").on(table.platformId),
  }),
);
