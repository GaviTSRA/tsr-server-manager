import { TRPCError } from "@trpc/server";
import { log, router, serverProcedure } from "../trpc.js";
import * as docker from "../../docker.js";
import { ServerType, serverTypes } from "../../index.js";
import * as schema from "../../schema.js";
import { eq } from "drizzle-orm";
import fs from "fs";
import { emitLogEvent, emitPowerEvent } from "../../events.js";
import { z } from "zod";
import { watchStats } from "../../stats.js";

export const powerRouter = router({
  start: serverProcedure
    .meta({
      permission: "power",
    })
    .input(z.object({}))
    .output(
      z.enum([
        "success",
        "server error",
        "unknown error",
        "bad paramater",
        "no such image",
        "conflict",
      ])
    )
    .mutation(async ({ ctx, input }) => {
      let containerId = ctx.server.containerId;
      if (!containerId) {
        const type = serverTypes.find(
          (type) => type.id === ctx.server.type
        ) as ServerType;

        const env = [] as string[];
        Object.entries(ctx.server.options).map(([id, value]) => {
          env.push(`${id.toUpperCase()}=${value}`);
        });
        env.push(`SERVER_RAM=${ctx.server.ramLimit}`);

        if (!containerId) {
          const result = await docker.createContainer(
            ctx.server.id,
            ctx.server.name.toLowerCase().replaceAll(" ", "-"),
            type.image ?? ctx.server.options["image"],
            [
              "/bin/bash",
              "-c",
              `screen -S server bash -c "/server/install.sh && ${type.command.replace(
                "${SERVER_RAM}",
                ctx.server.ramLimit.toString()
              )}"`,
            ],
            env,
            ctx.server.ports,
            ctx.server.cpuLimit,
            ctx.server.ramLimit,
            ctx.server.restartPolicy,
            ctx.server.restartRetryCount
          );
          if (result.status !== "success" || !result.containerId) {
            console.error(result);
            await log("Start server", false, input.userId, ctx);
            return result.status;
          }
          await ctx.db
            .update(schema.Server)
            .set({ containerId: result.containerId })
            .where(eq(schema.Server.id, ctx.server.id));
          containerId = result.containerId;
          fs.copyFileSync(
            `servertypes/${type.id}/install.sh`,
            `servers/${ctx.server.id}/install.sh`
          );
        }
      }
      const result = await docker.startContainer(containerId);
      if (result !== "success") {
        await log("Start server", false, input.userId, ctx);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result,
        });
      }
      await emitPowerEvent(ctx.server.id, "start");
      await log("Start server", true, input.userId, ctx);

      const res = await docker.attachToContainer(containerId);
      const asyncIterable = docker.createAsyncIterable(res.data);

      setTimeout(async () => {
        watchStats(ctx.server.id, containerId, ctx.server.cpuLimit);
      }, 0);

      setTimeout(async () => {
        for await (const chunk of asyncIterable) {
          const data = chunk.toString() as string;
          for (const logLine of data.split("\n")) {
            await emitLogEvent(ctx.server.id, logLine, ctx.server.type);
          }
        }
      }, 0);

      return result;
    }),
  restart: serverProcedure
    .meta({
      permission: "power",
    })
    .input(z.object({}))
    .output(z.enum(["success"]))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.server.containerId) {
        await log("Restart server", false, input.userId, ctx);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Server not installed",
        });
      }
      const result = await docker.restartContainer(ctx.server.containerId);
      if (result !== "success") {
        await log("Restart server", false, input.userId, ctx);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result,
        });
      }
      await emitPowerEvent(ctx.server.id, "restart");
      await log("Restart server", true, input.userId, ctx);
      return result;
    }),
  stop: serverProcedure
    .meta({
      permission: "power",
    })
    .input(z.object({}))
    .output(z.enum(["success"]))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.server.containerId) {
        await log("Stop server", false, input.userId, ctx);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Server not installed",
        });
      }
      docker.exec(ctx.server.containerId, [
        "screen",
        "-S",
        "server",
        "-X",
        "stuff",
        "stop^M",
      ]);
      const result = await docker.stopContainer(ctx.server.containerId);
      if (result !== "success") {
        await log("Stop server", false, input.userId, ctx);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result,
        });
      }
      await emitPowerEvent(ctx.server.id, "stop");
      await log("Stop server", true, input.userId, ctx);
      return result;
    }),
  kill: serverProcedure
    .meta({
      permission: "power",
    })
    .input(z.object({}))
    .output(z.enum(["success"]))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.server.containerId) {
        await log("Kill server", false, input.userId, ctx);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Server not installed",
        });
      }
      const result = await docker.killContainer(ctx.server.containerId);
      if (result !== "success") {
        await log("Kill server", false, input.userId, ctx);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result,
        });
      }
      await emitPowerEvent(ctx.server.id, "kill");
      await log("Kill server", true, input.userId, ctx);
      return result;
    }),
});
