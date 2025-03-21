import { nodeProcedure, router } from "../trpc";
import { z } from "zod";
import { NodeRouter } from "@tsm/node";
import { inferProcedureInput, inferProcedureOutput } from "@trpc/server";

export const startupRouter = router({
  read: nodeProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/server/{nodeId}/{serverId}/startup",
        protect: true,
      },
    })
    .input(
      z.object({
        serverId: z.string(),
      })
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["startup"]["read"]>>()
    )
    .query(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.startup.read.query({
        serverId: input.serverId,
        userId: ctx.user.id,
      });
    }),
  write: nodeProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/server/{nodeId}/{serverId}/startup",
        protect: true,
      },
    })
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["startup"]["write"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["startup"]["write"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.startup.write.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
});
