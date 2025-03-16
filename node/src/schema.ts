import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Data Types
export const ResetartPolicy = pgEnum("RestartPolicy", [
  "no",
  "on-failure",
  "unless-stopped",
  "always",
]);

// Tables
export const Server = pgTable("Server", {
  id: uuid().defaultRandom().primaryKey(),
  ownerId: uuid()
    .notNull()
    .references(() => User.id),
  name: varchar().notNull(),
  type: varchar().notNull(),
  containerId: varchar(),
  options: json().$type<{ [name: string]: string }>().notNull(),
  ports: json().$type<string[]>().notNull(),
  cpuLimit: real().notNull(),
  ramLimit: integer().notNull(),
  restartPolicy: ResetartPolicy().notNull().default("no"),
  restartRetryCount: integer().notNull().default(1),
  metadata: json().$type<{ [key: string]: any }>().notNull().default({}),
});

export const Log = pgTable(
  "Log",
  {
    userId: uuid()
      .notNull()
      .references(() => User.id),
    serverId: uuid()
      .notNull()
      .references(() => Server.id),
    log: text().notNull(),
    date: timestamp({ mode: "date" }).notNull(),
    success: boolean().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.serverId, table.log, table.date],
    }),
  ]
);

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

export const User = pgTable("User", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull().unique(),
});

// Relations
export const ServerRelations = relations(Server, ({ one, many }) => ({
  permissions: many(Permission),
  logs: many(Log),
  owner: one(User, {
    fields: [Server.ownerId],
    references: [User.id],
  }),
}));

export const PermissionsRelations = relations(Permission, ({ one }) => ({
  server: one(Server, {
    fields: [Permission.serverId],
    references: [Server.id],
  }),
  user: one(User, {
    fields: [Permission.userId],
    references: [User.id],
  }),
}));

export const LogRelations = relations(Log, ({ one }) => ({
  server: one(Server, {
    fields: [Log.serverId],
    references: [Server.id],
  }),
  user: one(User, {
    fields: [Log.userId],
    references: [User.id],
  }),
}));

export const UserRelations = relations(User, ({ many }) => ({
  servers: many(Server),
  permissions: many(Permission),
  logs: many(Log),
}));

// Schemas and Types
export const ServerSchema = createSelectSchema(Server).extend({
  ports: z.string().array(),
});
export const PermissionSchema = createSelectSchema(Permission);
export const LogSchema = createSelectSchema(Log);
export const UserSchema = createSelectSchema(User);

export type ServerType = z.infer<typeof ServerSchema>;
export type PermissionType = z.infer<typeof PermissionSchema>;
export type LogType = z.infer<typeof LogSchema>;
export type UserType = z.infer<typeof UserSchema>;
