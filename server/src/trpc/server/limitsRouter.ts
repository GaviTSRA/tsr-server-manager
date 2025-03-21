import { router, nodeProcedure } from "../trpc";
import { z } from "zod";
import { inferProcedureInput, inferProcedureOutput } from "@trpc/server";
import { NodeRouter } from "@tsm/node";

export const limitsRouter = router({
  read: nodeProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/server/{nodeId}/{serverId}/limits",
        protect: true,
      },
    })
    .input(z.object({ serverId: z.string() }))
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["limits"]["read"]>>()
    )
    .query(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.limits.read.query({
        serverId: input.serverId,
        userId: ctx.user.id,
      });
    }),
  write: nodeProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/server/{nodeId}/{serverId}/limits",
        protect: true,
      },
    })
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["limits"]["write"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["limits"]["write"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.limits.write.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
});
