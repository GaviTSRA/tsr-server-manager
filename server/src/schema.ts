import { relations } from "drizzle-orm";
import {
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
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
export const Permission = pgTable(
  "Permission",
  {
    userId: uuid()
      .notNull()
      .references(() => User.id),
    serverId: uuid()
      .notNull()
      .references(() => Server.id),
    permission: varchar().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.serverId, table.permission],
    }),
  ]
);

export const ServerRelations = relations(Server, ({ one, many }) => ({
  owner: one(User, {
    fields: [Server.ownerId],
    references: [User.id],
  }),
  permissions: many(Permission),
}));
export const UserRelations = relations(User, ({ many }) => ({
  permissions: many(Permission),
}));
export const PermissionRelations = relations(Permission, ({ one }) => ({
  user: one(User, {
    fields: [Permission.userId],
    references: [User.id],
  }),
  server: one(Server, {
    fields: [Permission.serverId],
    references: [Server.id],
  }),
}));

export const ServerSchema = createSelectSchema(Server).extend({
  ports: z.string().array(),
});
export const UserSchema = createSelectSchema(User);

export type ServerType = z.infer<typeof ServerSchema>;
export type UserType = z.infer<typeof UserSchema>;
