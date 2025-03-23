import { boolean, pgEnum, pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const NodeState = pgEnum("NodeState", [
  "CONNECTION_ERROR",
  "AUTHENTICATION_ERROR",
  "SYNC_ERROR",
  "CONNECTED",
]);

// Tables
export const User = pgTable("User", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull().unique(),
  password: varchar().notNull(),
  canCreateServers: boolean().notNull().default(false),
});

export const Node = pgTable("Node", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  url: varchar().notNull(),
  password: varchar().notNull(),
  state: NodeState().notNull(),
});

// Schemas and Types
export const UserSchema = createSelectSchema(User);
export const NodeSchema = createSelectSchema(Node);

export type UserType = z.infer<typeof UserSchema>;
export type NodeType = z.infer<typeof NodeSchema>;
