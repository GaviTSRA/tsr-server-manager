import { z } from "zod";
import { router, publicProcedure, authedProcedure } from "./trpc.js";
import { v4 } from "uuid";
import { TRPCError } from "@trpc/server";
import { serverRouter } from "./serverRouter.js";
import * as schema from "../schema.js";
import * as docker from "../docker.js";
import { serverTypes } from "../index.js";
import jwt from "jsonwebtoken";

const PASSWORD = process.env.PASSWORD;
if (!PASSWORD) {
  throw new Error("PASSWORD is not set");
}

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
  recentStats?: {
    date: Date;
    cpuUsage: number;
    ramUsage: number;
    cpuCount: number;
    ramAvailable: number;
  }[];
};

export const nodeRouter = router({
  server: serverRouter,
  ping: publicProcedure.query(async ({ ctx }) => {
    return { pong: true };
  }),
  authenticate: publicProcedure
    .input(z.object({ password: z.string() }))
    .output(z.string())
    .mutation(async ({ input }) => {
      if (input.password !== PASSWORD) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "NODE_UNAUTHORIZED",
        });
      }
      const token = jwt.sign({ authenticated: true }, PASSWORD);
      return token;
    }),
  syncUsers: authedProcedure
    .input(schema.UserSchema.array())
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (trx) => {
        for (const user of input) {
          await trx
            .insert(schema.User)
            .values(user)
            .onConflictDoUpdate({
              target: [schema.User.id],
              set: user,
            });
        }
      });
    }),
  servers: authedProcedure
    .input(z.object({ userId: z.string() }))
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
          recentStats: z
            .object({
              date: z.date(),
              cpuUsage: z.number(),
              cpuCount: z.number(),
              ramUsage: z.number(),
              ramAvailable: z.number(),
            })
            .array()
            .optional(),
        })
        .array()
    )
    .query(async ({ ctx, input }) => {
      const accessableServers = (
        await ctx.db.query.AssignedPermission.findMany({
          where: (permission, { eq, and }) =>
            and(
              eq(permission.userId, input.userId),
              eq(permission.permission, "server")
            ),
        })
      ).map((permission) => permission.serverId);
      const servers = await ctx.db.query.Server.findMany({
        where: (server, { eq, or, inArray }) =>
          or(
            eq(server.ownerId, input.userId),
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
        const recentStats = await ctx.db.query.ServerStat.findMany({
          where: (stat, { eq }) => eq(stat.serverId, server.id),
          orderBy: (stat, { desc }) => [desc(stat.date)],
          limit: 100,
          columns: {
            date: true,
            cpuUsage: true,
            ramUsage: true,
            cpuCount: true,
            ramAvailable: true,
          },
        });
        if (!data || !data.data) continue;
        result.push({
          id: server.id,
          containerId: server.containerId,
          name: server.name,
          status: data.data.status,
          type: server.type,
          recentStats: recentStats.reverse(),
        });
      }
      return result;
    }),
  serverTypes: publicProcedure
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
    .input(
      z.object({
        userId: z.string(),
        name: z.string(),
        type: z.string(),
      })
    )
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
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
        ownerId: input.userId,
        name: input.name,
        type: type.id,
        options: defaults,
        ports: [],
        cpuLimit: 1,
        ramLimit: 1024,
      });
    }),
});

export type NodeRouter = typeof nodeRouter;
