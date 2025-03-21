import { z } from "zod";
import { nodeProcedure, router } from "../trpc";
import { inferProcedureOutput } from "@trpc/server";
import { NodeRouter } from "@tsm/node";

export const logsRouter = router({
  read: nodeProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/server/{nodeId}/{serverId}/logs",
        protect: true,
      },
    })
    .input(z.object({ serverId: z.string() }))
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["logs"]["read"]>>()
    )
    .query(async ({ ctx, input }) => {
      const data = await ctx.node.trpc.server.logs.read.query({
        serverId: input.serverId,
        userId: ctx.user.id,
      });
      return data.map((entry) => ({
        ...entry,
        date: new Date(entry.date),
      }));
    }),
});
