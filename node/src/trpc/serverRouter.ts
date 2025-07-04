import { TRPCError } from "@trpc/server";
import * as docker from "../docker.js";
import { hasPermission, log, router, serverProcedure } from "./trpc.js";
import { z } from "zod";
import { serverFilesRouter } from "./server/filesRouter.js";
import { startupRouter } from "./server/startupRouter.js";
import { networkRouter } from "./server/networkRouter.js";
import { limitsRouter } from "./server/limitsRouter.js";
import { powerRouter } from "./server/powerRouter.js";
import { usersRouter } from "./server/usersRouter.js";
import { logsRouter } from "./server/logsRouter.js";
import { customRouter } from "./server/custom.js";

export const serverRouter = router({
  power: powerRouter,
  files: serverFilesRouter,
  network: networkRouter,
  startup: startupRouter,
  limits: limitsRouter,
  users: usersRouter,
  logs: logsRouter,
  custom: customRouter,
  server: serverProcedure
    .meta({
      permission: "server",
    })
    .input(z.object({}))
    .output(
      z.object({
        id: z.string(),
        containerId: z.string().nullable(),
        name: z.string(),
        type: z.string(),
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
      })
    )
    .query(async ({ ctx }) => {
      let inspect = undefined;
      if (ctx.server.containerId) {
        inspect = await docker.inspectContainer(ctx.server.containerId ?? "");
      }
      return {
        id: ctx.server.id,
        containerId: ctx.server.containerId,
        name: ctx.server.name,
        type: ctx.server.type,
        status: inspect?.data?.status,
      };
    }),
  status: serverProcedure
    .meta({
      permission: "status",
    })
    .output(
      z
        .object({
          date: z.date(),
          cpuUsage: z.number(),
          cpuCount: z.number().optional(),
          ramUsage: z.number(),
          ramAvailable: z.number().optional(),
          diskUsage: z.number(),
          networkIn: z.number(),
          networkOut: z.number(),
        })
        .array()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.server.containerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Server not installed",
        });
      }
      const hasLimitPermission = await hasPermission(
        ctx,
        input.userId,
        ctx.server,
        "limits.read"
      );
      const data = await ctx.db.query.ServerStat.findMany({
        where: (serverStat, { eq }) => eq(serverStat.serverId, ctx.server.id),
        orderBy: (serverStat, { desc }) => desc(serverStat.date),
        limit: 100,
        columns: {
          date: true,
          cpuUsage: true,
          cpuCount: hasLimitPermission,
          ramUsage: true,
          ramAvailable: hasLimitPermission,
          diskUsage: true,
          networkIn: true,
          networkOut: true,
        },
      });
      return data.reverse();
    }),
  consoleLogs: serverProcedure
    .meta({
      permission: "console.read",
    })
    .subscription(async function* ({ ctx, input }) {
      if (!ctx.server.containerId) {
        return;
      }

      try {
        const res = await docker.attachToContainer(ctx.server.containerId);
        const asyncIterable = docker.createAsyncIterable(res.data);

        for await (const chunk of asyncIterable) {
          yield chunk.toString() as string;
        }
      } catch (error) {
        console.error("Error connecting to Docker API:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect to Docker API",
        });
      }
    }),
  run: serverProcedure
    .meta({
      permission: "console.write",
      log: "Run command",
    })
    .input(z.object({ command: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      if (!ctx.server.containerId) {
        await log(`Run command: '${input.command}'`, false, input.userId, ctx);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Server not installed",
        });
      }
      await docker.exec(ctx.server.containerId, [
        "screen",
        "-S",
        "server",
        "-X",
        "stuff",
        input.command + "^M",
      ]);
      await log(`Run command: '${input.command}'`, true, input.userId, ctx);
    }),
});
