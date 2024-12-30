import * as docker from "../../docker";
import { router, serverProcedure } from "../trpc";
import { z } from "zod";
import * as schema from "../../schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const limitsRouter = router({
  read: serverProcedure
    .meta({
      permission: "limits.read",
    })
    .query(async ({ ctx }) => {
      return {
        cpu: ctx.server.cpuLimit,
        ram: ctx.server.ramLimit,
        restartPolicy: ctx.server.restartPolicy,
        restartRetryCount: ctx.server.restartRetryCount
      };
    }),
  write: serverProcedure
    .meta({
      permission: "limits.write",
    })
    .input(
      z.object({
        cpuLimit: z.number().optional(),
        ramLimit: z.number().optional(),
        restartPolicy: z.enum(["no", "on-failure", "unless-stopped", "always"]).optional(),
        restartRetryCount: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.Server)
        .set({
          cpuLimit: input.cpuLimit,
          ramLimit: input.ramLimit,
          restartPolicy: input.restartPolicy,
          restartRetryCount: input.restartRetryCount,
          containerId: null,
        })
        .where(eq(schema.Server.id, ctx.server.id));
      if (ctx.server.containerId) {
        await docker.removeContainer(ctx.server.containerId);
      }
    }),
});
