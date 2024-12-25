import { TRPCError } from "@trpc/server";
import { router, serverProcedure } from "../trpc";
import * as docker from "../../docker";
import { ServerType, serverTypes } from "../..";
import * as schema from "../../schema";
import { eq } from "drizzle-orm";
import fs from "fs";

export const powerRouter = router({
  start: serverProcedure
    .meta({
      permission: "power",
    })
    .mutation(async ({ ctx }) => {
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
  restart: serverProcedure
    .meta({
      permission: "power",
    })
    .mutation(async ({ ctx, input }) => {
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
  stop: serverProcedure
    .meta({
      permission: "power",
    })
    .mutation(async ({ ctx, input }) => {
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
  kill: serverProcedure
    .meta({
      permission: "power",
    })
    .mutation(async ({ ctx, input }) => {
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
});
