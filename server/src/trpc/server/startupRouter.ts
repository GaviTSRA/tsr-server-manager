import { log, router, serverProcedure } from "../trpc";
import * as schema from "../../schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import * as docker from "../../docker";

export const startupRouter = router({
  read: serverProcedure
    .meta({
      permission: "startup.read",
    })
    .query(async ({ ctx }) => {
      return ctx.server.options;
    }),
  write: serverProcedure
    .meta({
      permission: "startup.write",
    })
    .input(
      z.object({
        options: z.record(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.Server)
        .set({ options: input.options, containerId: null })
        .where(eq(schema.Server.id, ctx.server.id));
      if (ctx.server.containerId) {
        await docker.removeContainer(ctx.server.containerId);
      }
      log(`Update startup parameters: ${JSON.stringify(input.options)}`, true, ctx);
    }),
});
