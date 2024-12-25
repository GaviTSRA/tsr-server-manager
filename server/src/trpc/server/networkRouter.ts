import * as docker from "../../docker";
import { router, serverProcedure } from "../trpc";
import { z } from "zod";
import * as schema from "../../schema";
import { eq } from "drizzle-orm";

export const networkRouter = router({
  read: serverProcedure
    .meta({
      permission: "network.read",
    })
    .query(async ({ ctx }) => {
      return ctx.server.ports;
    }),
  write: serverProcedure
    .meta({
      permission: "network.write",
    })
    .input(z.object({ ports: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.Server)
        .set({ ports: input.ports, containerId: null })
        .where(eq(schema.Server.id, ctx.server.id));
      if (ctx.server.containerId) {
        await docker.removeContainer(ctx.server.containerId);
      }
    }),
});
