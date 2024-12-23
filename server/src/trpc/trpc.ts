import { initTRPC } from "@trpc/server";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../schema";

export const createContext = async () => {
  const db = drizzle(process.env.DATABASE_URL!, { schema });
  return {
    db,
  };
};
export type Context = Awaited<ReturnType<typeof createContext>>;

export const t = initTRPC.context<typeof createContext>().create({
  sse: {
    ping: {
      enabled: true,
      intervalMs: 3_000,
    },
    client: {
      reconnectAfterInactivityMs: 5_000,
    },
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
