import { z } from "zod";
import {
  router,
  publicProcedure,
  authedProcedure,
  nodeProcedure,
} from "./trpc";
import {
  TRPCError,
} from "@trpc/server";
import { serverRouter } from "./serverRouter";
import { userRouter } from "./userRouter";
import { nodes } from "..";
import { nodeRouter } from "./nodeRouter";
import { handleNodeError } from "../nodes";
import { ServersResponse_Server, ServerTypesResponse_Manifest } from "../generated/node"

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
          servers: z.custom<ServersResponse_Server>().array(),
        })
        .array()
    )
    .query(async (_) => {
      const result = [];
      for (const node of Object.values(nodes)) {
        try {
          result.push({
            nodeId: node.id,
            nodeName: node.name,
            servers: (await node.grpc.getServers({})).servers,
          });
        } catch (err) {
          await handleNodeError(node, err);
          continue;
        }
        
      }
      return result;
    }),
  serverTypes: publicProcedure
    .meta({ openapi: { method: "GET", path: "/serverTypes", protect: false } })
    .input(z.void())
    .output(
      z
        .object({
          nodeId: z.string(),
          nodeName: z.string(),
          serverTypes:
            z.custom<ServerTypesResponse_Manifest>().array(),
        })
        .array()
    )
    .query(async (_) => {
      const result = [];
      for (const node of Object.values(nodes)) {
        try {
          result.push({
            nodeId: node.id,
            nodeName: node.name,
            serverTypes: ( await node.grpc.getServerTypes({})).serverTypes,
          });
        } catch (err) {
          console.info("Error fetching server types from node", err);
          await handleNodeError(node, err);
          continue;
        }
        
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
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user.canCreateServers) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "User can't create servers",
        });
      }

      try {
        await ctx.node.grpc.createServer({
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
