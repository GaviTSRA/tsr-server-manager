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
  name: varchar().notNull(),
  state: ServerState().notNull(),
  type: varchar().notNull(),
  containerId: varchar(),
  options: json().$type<{ [name: string]: string }>().notNull(),
  ports: json().$type<string[]>().notNull(),
  cpuLimit: real().notNull(),
  ramLimit: integer().notNull(),
});
export const ServerSchema = createSelectSchema(Server).extend({
  ports: z.string().array(),
});
export type ServerType = z.infer<typeof ServerSchema>;
