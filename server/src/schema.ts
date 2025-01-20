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

// Relations
export const ServerRelations = relations(Server, ({ one, many }) => ({
  owner: one(User, {
    fields: [Server.ownerId],
    references: [User.id],
  }),
  permissions: many(Permission),
  logs: many(Log),
}));

export const UserRelations = relations(User, ({ many }) => ({
  permissions: many(Permission),
  logs: many(Log),
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

export const LogRelations = relations(Log, ({ one }) => ({
  user: one(User, {
    fields: [Log.userId],
    references: [User.id],
  }),
  server: one(Server, {
    fields: [Log.serverId],
    references: [Server.id],
  }),
}));

// Schemas and Types
export const ServerSchema = createSelectSchema(Server).extend({
  ports: z.string().array(),
});
export const UserSchema = createSelectSchema(User);
export const PermissionSchema = createSelectSchema(Permission);
export const LogSchema = createSelectSchema(Log);

export type ServerType = z.infer<typeof ServerSchema>;
export type UserType = z.infer<typeof UserSchema>;
export type PermissionType = z.infer<typeof PermissionSchema>;
export type LogType = z.infer<typeof LogSchema>;
