import {
  integer,
  json,
  pgEnum,
  pgTable,
  real,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const ServerState = pgEnum("ServerState", [
  "INSTALLED",
  "NOT_INSTALLED",
]);

export const Server = pgTable("Server", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  state: ServerState().notNull(),
  type: varchar().notNull(),
  containerId: varchar(),
  options: json().$type<{ [name: string]: string }>().notNull(),
  ports: json().$type<string[]>().notNull(),
  cpuLimit: real().notNull(),
  ramLimit: integer().notNull(),
});

export type ServerType = {
  id: string;
  state: string;
  name: string;
  type: string;
  containerId: string | null;
  options: { [name: string]: string };
  ports: string[];
  cpuLimit: number;
  ramLimit: number;
};
