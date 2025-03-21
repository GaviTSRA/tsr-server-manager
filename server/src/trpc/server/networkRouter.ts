import { nodeProcedure, router } from "../trpc";
import { z } from "zod";
import { inferProcedureInput, inferProcedureOutput } from "@trpc/server";
import { NodeRouter } from "@tsm/node";

export const networkRouter = router({
  read: nodeProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/server/{nodeId}/{serverId}/network",
        protect: true,
      },
    })
    .input(z.object({ serverId: z.string() }))
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["network"]["read"]>>()
    )
    .query(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.network.read.query({
        serverId: input.serverId,
        userId: ctx.user.id,
      });
    }),
  write: nodeProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/server/{nodeId}/{serverId}/network",
        protect: true,
      },
    })
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["network"]["write"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["network"]["write"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.network.write.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
});
