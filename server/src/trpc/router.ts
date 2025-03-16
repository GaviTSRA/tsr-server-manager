import { z } from "zod";
import {
  router,
  publicProcedure,
  authedProcedure,
  nodeProcedure,
} from "./trpc";
import {
  inferProcedureInput,
  inferProcedureOutput,
  TRPCError,
} from "@trpc/server";
import { serverRouter } from "./serverRouter";
import { userRouter } from "./userRouter";
import { NodeRouter } from "@tsm/node";
import { nodes } from "..";

export const appRouter = router({
  user: userRouter,
  server: serverRouter,
  servers: authedProcedure
    .meta({ openapi: { method: "GET", path: "/servers", protect: true } })
    .input(z.void())
    .output(
      z
        .object({
          nodeId: z.string(),
          nodeName: z.string(),
          servers: z.custom<inferProcedureOutput<NodeRouter["servers"]>>(),
        })
        .array()
    )
    .query(async ({ ctx }) => {
      const result = [];
      for (const node of Object.values(nodes)) {
        const servers = await node.trpc.servers.query({ userId: ctx.user.id });
        result.push({
          nodeId: node.id,
          nodeName: node.name,
          servers,
        });
      }
      return result;
    }),
  serverTypes: publicProcedure
    .meta({ openapi: { method: "GET", path: "/serverTypes", protect: false } })
    .input(z.custom<inferProcedureInput<NodeRouter["serverTypes"]>>())
    .output(
      z
        .object({
          nodeId: z.string(),
          nodeName: z.string(),
          serverTypes:
            z.custom<inferProcedureOutput<NodeRouter["serverTypes"]>>(),
        })
        .array()
    )
    .query(async ({ input }) => {
      const result = [];
      for (const node of Object.values(nodes)) {
        const serverTypes = await node.trpc.serverTypes.query(input);
        result.push({
          nodeId: node.id,
          nodeName: node.name,
          serverTypes,
        });
      }
      return result;
    }),
  createServer: nodeProcedure
    .meta({ openapi: { method: "POST", path: "/createServer", protect: true } })
    .input(
      z.object({
        name: z.string(),
        type: z.string(),
      })
    )
    .output(z.custom<inferProcedureOutput<NodeRouter["createServer"]>>())
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user.canCreateServers) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User can't create servers",
        });
      }

      return await ctx.node.trpc.createServer.mutate({
        name: input.name,
        type: input.type,
        userId: ctx.user.id,
      });
    }),
});

export type AppRouter = typeof appRouter;
