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
});
