import * as docker from "../../docker";
import { log, router, serverProcedure } from "../trpc";
import { z } from "zod";
import * as schema from "../../schema";
import { eq } from "drizzle-orm";

export const networkRouter = router({
  read: serverProcedure
    .meta({
      permission: "network.read",
      openapi: { method: "GET", path: "/server/{serverId}/network", protect: true }
    })
    .input(z.object({}))
    .output(z.string().array())
    .query(async ({ ctx }) => {
      return ctx.server.ports;
    }),
  write: serverProcedure
    .meta({
      permission: "network.write",
      openapi: { method: "POST", path: "/server/{serverId}/network", protect: true }
    })
    .input(z.object({ ports: z.array(z.string()) }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.Server)
        .set({ ports: input.ports, containerId: null })
        .where(eq(schema.Server.id, ctx.server.id));
      if (ctx.server.containerId) {
        await docker.removeContainer(ctx.server.containerId);
      }
      await log(
        `Update network configuration: ${JSON.stringify(input.ports)}`,
        true,
        ctx
      );
    }),
});
