import { relations } from "drizzle-orm";
import {
  integer,
  json,
  pgEnum,
  pgTable,
  real,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const ServerState = pgEnum("ServerState", [
  "INSTALLED",
  "NOT_INSTALLED",
]);

export const Server = pgTable("Server", {
  id: uuid().defaultRandom().primaryKey(),
  ownerId: uuid()
    .notNull()
    .references(() => User.id),
  name: varchar().notNull(),
  state: ServerState().notNull(),
  type: varchar().notNull(),
  containerId: varchar(),
  options: json().$type<{ [name: string]: string }>().notNull(),
  ports: json().$type<string[]>().notNull(),
  cpuLimit: real().notNull(),
  ramLimit: integer().notNull(),
});
export const User = pgTable("User", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull().unique(),
  password: varchar().notNull(),
});

export const ServerRelations = relations(Server, ({ one }) => ({
  owner: one(User, {
    fields: [Server.ownerId],
    references: [User.id],
  }),
}));

export const ServerSchema = createSelectSchema(Server).extend({
  ports: z.string().array(),
});
export const UserSchema = createSelectSchema(User);

export type ServerType = z.infer<typeof ServerSchema>;
export type UserType = z.infer<typeof UserSchema>;
