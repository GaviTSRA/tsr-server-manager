import { z } from "zod";
import { router, publicProcedure, authedProcedure } from "./trpc";
import { v4 } from "uuid";
import { TRPCError } from "@trpc/server";
import { serverRouter } from "./serverRouter";
import * as schema from "../schema";
import * as docker from "../docker";
import { userRouter } from "./userRouter";
import { serverTypes } from "..";

type ServerStatus = {
  id: string;
  containerId?: string;
  name: string;
  status?:
    | "created"
    | "running"
    | "paused"
    | "restarting"
    | "removing"
    | "exited"
    | "dead";
  type: string;
};

export const appRouter = router({
  user: userRouter,
  server: serverRouter,
  servers: authedProcedure
    .meta({ openapi: { method: "GET", path: "/servers", protect: true } })
    .input(z.void())
    .output(
      z
        .object({
          id: z.string(),
          containerId: z.string().optional(),
          name: z.string(),
          status: z
            .enum([
              "created",
              "running",
              "paused",
              "restarting",
              "removing",
              "exited",
              "dead",
            ])
            .optional(),
          type: z.string(),
        })
        .array()
    )
    .query(async ({ ctx }) => {
      const accessableServers = (
        await ctx.db.query.Permission.findMany({
          where: (permission, { eq, and }) =>
            and(
              eq(permission.userId, ctx.user.id),
              eq(permission.permission, "server")
            ),
        })
      ).map((permission) => permission.serverId);
      const servers = await ctx.db.query.Server.findMany({
        where: (server, { eq, or, inArray }) =>
          or(
            eq(server.ownerId, ctx.user.id),
            inArray(server.id, accessableServers)
          ),
      });
      const result = [] as ServerStatus[];
      for (const server of servers) {
        if (!server.containerId) {
          result.push({
            id: server.id,
            name: server.name,
            type: server.type,
          });
          continue;
        }
        const data = await docker.inspectContainer(server.containerId);
        if (!data || !data.data) continue;
        result.push({
          id: server.id,
          containerId: server.containerId,
          name: server.name,
          status: data.data.status,
          type: server.type,
        });
      }
      return result;
    }),
  serverTypes: publicProcedure
    .meta({ openapi: { method: "GET", path: "/serverTypes", protect: false } })
    .input(z.void())
    .output(
      z
        .object({
          id: z.string(),
          name: z.string(),
          icon: z.string(),
          command: z.string(),
          image: z.string().nullable(),
          options: z.record(
            z.string(),
            z.object({
              name: z.string(),
              description: z.string(),
              type: z.enum(["string", "enum"]),
              default: z.string(),
              options: z.string().array().optional(),
            })
          ),
          tabs: z.string().array().optional(),
        })
        .array()
    )
    .query(async () => {
      return serverTypes;
    }),
  createServer: authedProcedure
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

      const type = serverTypes.find((type) => type.id === input.type);
      if (!type) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unkown server type",
        });
      }
      const id = v4();
      const defaults: { [name: string]: string } = {};
      Object.entries(type.options).map(([key, value]) => {
        if (value.default) {
          defaults[key] = value.default;
        }
      });
      await ctx.db.insert(schema.Server).values({
        id,
        ownerId: ctx.user.id,
        name: input.name,
        type: type.id,
        options: defaults,
        ports: [],
        cpuLimit: 1,
        ramLimit: 1024,
      });
    }),
});

export type AppRouter = typeof appRouter;
