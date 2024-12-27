import { TRPCError } from "@trpc/server";
import * as docker from "../docker";
import { Context, hasPermission, publicProcedure, router, serverProcedure, t } from "./trpc";
import { z } from "zod";
import * as schema from "../schema";
import EventEmitter from "events";
import { serverFilesRouter } from "./server/filesRouter";
import { startupRouter } from "./server/startupRouter";
import { networkRouter } from "./server/networkRouter";
import { limitsRouter } from "./server/limitsRouter";
import { powerRouter } from "./server/powerRouter";

function createAsyncIterable(emitter: EventEmitter) {
  return {
    [Symbol.asyncIterator]() {
      const queue: any[] = [];
      let resolve: ((value: any) => void) | null = null;

      emitter.on("data", (data) => {
        if (resolve) {
          resolve({ value: data });
          resolve = null;
        } else {
          queue.push(data);
        }
      });
      return {
        next() {
          return new Promise((res) => {
            if (queue.length > 0) {
              res({ value: queue.shift() });
            } else {
              resolve = res;
            }
          });
        },
      };
    },
  };
}

export const serverRouter = router({
  power: powerRouter,
  files: serverFilesRouter,
  network: networkRouter,
  startup: startupRouter,
  limits: limitsRouter,
  server: serverProcedure
    .meta({
      permission: "server",
    })
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
        status: inspect?.data?.status
      };
    }),
  status: serverProcedure
    .meta({
      permission: "status"
    })
    .subscription(async function* ({ ctx, input }) {
      if (!ctx.server.containerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Server not installed"
        })
      }
      const result = docker.containerStats(ctx.server.containerId);
      const hasLimitPermission = await hasPermission(ctx, ctx.user.id, ctx.server.id, "limits.read");
      try {
        for await (const part of result) {
          yield {
            cpuUsage: part.cpuUsage,
            cpuAvailable: hasLimitPermission ? ctx.server.cpuLimit : undefined,
            ramUsage: part.ramUsage,
            ramAvailable: hasLimitPermission ? part.ramAvailable : undefined,
          };
        }
      } catch (error) {
        console.error("Error during iteration:", error);
      }
    }),
  logs: serverProcedure
    .meta({
      permission: "console.read"
    })
    .subscription(async function* ({ ctx, input }) {
      if (!ctx.server.containerId) {
        return;
      }

      try {
        const res = await docker.attachToContainer(ctx.server.containerId);
        const asyncIterable = createAsyncIterable(res.data);

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
    })
    .input(z.object({ command: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.server.containerId) {
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
    }),
});
