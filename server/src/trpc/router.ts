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
};

export const appRouter = router({
  user: userRouter,
  server: serverRouter,
  servers: authedProcedure.query(async ({ ctx }) => {
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
      });
    }
    return result;
  }),
  serverTypes: publicProcedure.query(async () => {
    return serverTypes;
  }),
  createServer: authedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.string(),
      })
    )
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
