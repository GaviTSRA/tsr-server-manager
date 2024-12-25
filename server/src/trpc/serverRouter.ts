import { TRPCError } from "@trpc/server";
import * as docker from "../docker";
import { Context, publicProcedure, router, serverProcedure, t } from "./trpc";
import { z } from "zod";
import * as schema from "../schema";
import EventEmitter from "events";
import { serverFilesRouter } from "./server/filesRouter";
import { startupRouter } from "./server/startupRouter";
import { networkRouter } from "./server/networkRouter";
import { limitsRouter } from "./server/limitsRouter";

async function getServer(
  serverId: string,
  ctx: Context
): Promise<schema.ServerType> {
  try {
    const result = await ctx.db.query.Server.findFirst({
      where: (server, { eq }) => eq(server.id, serverId),
    });
    if (result) {
      return result;
    } else {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  } catch {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
}

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
  files: serverFilesRouter,
  startup: startupRouter,
  network: networkRouter,
  limits: limitsRouter,
  status: serverProcedure
    .meta({
      permission: "server",
    })
    .query(async ({ ctx }) => {
      const result = ctx.server.containerId
        ? await docker.inspectContainer(ctx.server.containerId)
        : undefined;
      if (result && result.status !== "success") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.status,
        });
      }
      return {
        id: ctx.server.id,
        containerId: ctx.server.containerId,
        name: ctx.server.name,
        type: ctx.server.type,
        status: result?.data?.status,
        cpuUsage: result?.data?.cpuUsage,
        usedRam: result?.data?.usedRam,
        availableRam: result?.data?.availableRam,
      };
    }),
  connect: publicProcedure
    .input(z.object({ serverId: z.string() }))
    .subscription(async function* ({ ctx, input }) {
      const server = await getServer(input.serverId, ctx);
      if (!server.containerId) {
        return;
      }

      try {
        const res = await docker.attachToContainer(server.containerId);
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
