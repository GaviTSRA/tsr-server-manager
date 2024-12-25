import { TRPCError } from "@trpc/server";
import * as docker from "../docker";
import {
  authedProcedure,
  Context,
  publicProcedure,
  router,
  serverProcedure,
  t,
} from "./trpc";
import { z } from "zod";
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { serverFilesRouter } from "./serverFilesRouter";
import EventEmitter from "events";
import fs from "fs";

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

type ServerType = {
  id: string;
  command: string;
  name: string;
  image: string | null;
  options: {
    [name: string]:
      | {
          type: "string";
          default: string;
        }
      | {
          type: "enum";
          default: string;
          options: string[];
        };
  };
};

const serverTypes: ServerType[] = [];
fs.readdirSync("servertypes").forEach((folder) => {
  const json = fs
    .readFileSync(`servertypes/${folder}/manifest.json`)
    .toString();
  const data = JSON.parse(json);
  serverTypes.push({
    id: folder,
    name: data.name,
    image: data.image,
    command: data.command,
    options: data.options,
  });
});

export const serverRouter = router({
  files: serverFilesRouter,
  status: serverProcedure.query(async ({ ctx }) => {
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
      options: ctx.server.options,
      status: result?.data?.status,
      ports: ctx.server.ports,
      cpuUsage: result?.data?.cpuUsage,
      usedRam: result?.data?.usedRam,
      availableRam: result?.data?.availableRam,
      cpuLimit: ctx.server.cpuLimit,
      ramLimit: ctx.server.ramLimit,
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
  start: serverProcedure.mutation(async ({ ctx, input }) => {
    let containerId = ctx.server.containerId;
    if (ctx.server.state === "NOT_INSTALLED") {
      const type = serverTypes.find(
        (type) => type.id === ctx.server.type
      ) as ServerType;

      const env = [] as string[];
      Object.entries(ctx.server.options).map(([id, value]) => {
        env.push(`${id.toUpperCase()}=${value}`);
      });

      if (!containerId) {
        const result = await docker.createContainer(
          ctx.server.id,
          ctx.server.name.toLowerCase().replace(" ", "-"),
          type.image ?? ctx.server.options["image"],
          [
            "/bin/bash",
            "-c",
            `screen -S server bash -c "/server/install.sh && ${type.command}"`,
          ],
          env,
          ctx.server.ports,
          ctx.server.cpuLimit,
          ctx.server.ramLimit
        );
        if (result.status !== "success" || !result.containerId) {
          console.error(result);
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
      await docker.startContainer(containerId);
      return;
    }

    if (!ctx.server.containerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Server not installed",
      });
    }
    const result = await docker.startContainer(ctx.server.containerId);
    if (result !== "success") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result,
      });
    }
    return result;
  }),
  restart: serverProcedure.mutation(async ({ ctx, input }) => {
    if (!ctx.server.containerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Server not installed",
      });
    }
    const result = await docker.restartContainer(ctx.server.containerId);
    if (result !== "success") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result,
      });
    }
    return result;
  }),
  stop: serverProcedure.mutation(async ({ ctx, input }) => {
    if (!ctx.server.containerId) {
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
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result,
      });
    }
    return result;
  }),
  kill: serverProcedure.mutation(async ({ ctx, input }) => {
    if (!ctx.server.containerId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Server not installed",
      });
    }
    const result = await docker.killContainer(ctx.server.containerId);
    if (result !== "success") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: result,
      });
    }
    return result;
  }),
  setOptions: serverProcedure
    .input(
      z.object({
        options: z.record(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.Server)
        .set({ options: input.options, containerId: null })
        .where(eq(schema.Server.id, ctx.server.id));
      if (ctx.server.containerId) {
        await docker.removeContainer(ctx.server.containerId);
      }
    }),
  setPorts: serverProcedure
    .input(z.object({ ports: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.Server)
        .set({ ports: input.ports, containerId: null })
        .where(eq(schema.Server.id, ctx.server.id));
      if (ctx.server.containerId) {
        await docker.removeContainer(ctx.server.containerId);
      }
    }),
  setLimits: serverProcedure
    .input(
      z.object({
        cpuLimit: z.number(),
        ramLimit: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.Server)
        .set({
          cpuLimit: input.cpuLimit,
          ramLimit: input.ramLimit,
          containerId: null,
        })
        .where(eq(schema.Server.id, ctx.server.id));
      if (ctx.server.containerId) {
        await docker.removeContainer(ctx.server.containerId);
      }
    }),
  run: serverProcedure
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
