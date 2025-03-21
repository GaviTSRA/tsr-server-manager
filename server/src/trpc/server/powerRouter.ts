import { inferProcedureOutput } from "@trpc/server";
import { nodeProcedure, router } from "../trpc";
import { z } from "zod";
import { NodeRouter } from "@tsm/node";

export const powerRouter = router({
  start: nodeProcedure
    .meta({
      permission: "power",
      openapi: {
        method: "POST",
        path: "/server/${nodeId}/{serverId}/power/start",
        protect: true,
      },
    })
    .input(z.object({ serverId: z.string() }))
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["power"]["start"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.power.start.mutate({
        userId: ctx.user.id,
        serverId: input.serverId,
      });
    }),
  restart: nodeProcedure
    .meta({
      permission: "power",
      openapi: {
        method: "POST",
        path: "/server/{nodeId}/{serverId}/power/restart",
        protect: true,
      },
    })
    .input(z.object({ serverId: z.string() }))
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["power"]["restart"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.power.restart.mutate({
        userId: ctx.user.id,
        serverId: input.serverId,
      });
    }),
  stop: nodeProcedure
    .meta({
      permission: "power",
      openapi: {
        method: "POST",
        path: "/server/{nodeId}/{serverId}/power/stop",
        protect: true,
      },
    })
    .input(z.object({ serverId: z.string() }))
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["power"]["stop"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.power.stop.mutate({
        userId: ctx.user.id,
        serverId: input.serverId,
      });
    }),
  kill: nodeProcedure
    .meta({
      permission: "power",
      openapi: {
        method: "POST",
        path: "/server/{nodeId}/{serverId}/power/kill",
        protect: true,
      },
    })
    .input(z.object({ serverId: z.string() }))
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["power"]["kill"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.power.kill.mutate({
        userId: ctx.user.id,
        serverId: input.serverId,
      });
    }),
});
