import { z } from "zod";
import { nodeProcedure, router } from "../trpc";
import { inferProcedureOutput } from "@trpc/server";
import { NodeRouter } from "@tsm/node";

export const customRouter = router({
  mcForge: {
    getPlayers: nodeProcedure
      .input(z.object({ serverId: z.string() }))
      .output(
        z.custom<
          inferProcedureOutput<
            NodeRouter["server"]["custom"]["mcForge"]["getPlayers"]
          >
        >()
      )
      .query(async ({ ctx, input }) => {
        return await ctx.node.trpc.server.custom.mcForge.getPlayers.query({
          serverId: input.serverId,
          userId: ctx.user.id,
        });
      }),
    getOps: nodeProcedure
      .input(z.object({ serverId: z.string() }))
      .output(
        z.custom<
          inferProcedureOutput<
            NodeRouter["server"]["custom"]["mcForge"]["getOps"]
          >
        >()
      )
      .query(async ({ ctx, input }) => {
        return await ctx.node.trpc.server.custom.mcForge.getOps.query({
          serverId: input.serverId,
          userId: ctx.user.id,
        });
      }),
  },
});
