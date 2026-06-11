import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { entityStatusEnum } from "./enums";

export const platformsTable = pgTable("platforms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  status: entityStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
