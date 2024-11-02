import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const Server = pgTable("Server", {
    id: uuid().defaultRandom().primaryKey(),
    name: varchar().notNull(),
    containerId: varchar().notNull()
})

export type ServerType = {
    id: string;
    name: string;
    containerId: string;
};