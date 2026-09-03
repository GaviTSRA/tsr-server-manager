import { nodeProcedure, router } from "../trpc";
import { z } from "zod";
import { Empty } from "../../generated/google/protobuf/empty";

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
    .output(z.custom<Empty>())
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.grpc.server.power.start({
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
    .output(z.custom<Empty>())
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.grpc.server.power.restart({
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
    .output(z.custom<Empty>())
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.grpc.server.power.stop({
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
    .output(z.custom<Empty>())
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.grpc.server.power.kill({
        userId: ctx.user.id,
        serverId: input.serverId,
      });
    }),
});
