import { boolean, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Tables
export const User = pgTable("User", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull().unique(),
  password: varchar().notNull(),
  canCreateServers: boolean().notNull().default(false),
});

export const Node = pgTable("Node", {
  id: uuid().defaultRandom().primaryKey(),
  url: varchar().notNull(),
  name: varchar().notNull(),
});

// Schemas and Types
export const UserSchema = createSelectSchema(User);

export type UserType = z.infer<typeof UserSchema>;
