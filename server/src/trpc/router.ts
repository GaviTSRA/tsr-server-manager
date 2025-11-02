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
import { nodeRouter } from "./nodeRouter";
import { handleNodeError } from "../nodes";

export const appRouter = router({
  user: userRouter,
  server: serverRouter,
  node: nodeRouter,
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
        let servers;
        try {
          servers = await node.trpc.servers.query({
            userId: ctx.user.id,
          });
        } catch (err) {
          await handleNodeError(node, err);
          continue;
        }
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
        let serverTypes;
        try {
          serverTypes = await node.trpc.serverTypes.query(input);
        } catch (err) {
          console.info("Error fetching server types from node", err);
          await handleNodeError(node, err);
          continue;
        }
        result.push({
          nodeId: node.id,
          nodeName: node.name,
          serverTypes,
        });
      }
      console.info(result);
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

      try {
        return await ctx.node.trpc.createServer.mutate({
          name: input.name,
          type: input.type,
          userId: ctx.user.id,
        });
      } catch (err) {
        throw await handleNodeError(ctx.node, err);
      }
    }),
});

export type AppRouter = typeof appRouter;
