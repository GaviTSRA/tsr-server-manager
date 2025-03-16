import { z } from "zod";
import { router, serverProcedure } from "../trpc";

export const logsRouter = router({
  read: serverProcedure
    .meta({
      permission: "logs.read",
    })
    .input(z.object({}))
    .output(
      z
        .object({
          date: z.date(),
          userId: z.string(),
          serverId: z.string(),
          log: z.string(),
          success: z.boolean(),
          user: z.object({
            name: z.string(),
          }),
        })
        .array()
    )
    .query(async ({ ctx }) => {
      const logs = await ctx.db.query.Log.findMany({
        where: (log, { eq }) => eq(log.serverId, ctx.server.id),
        orderBy: (log, { desc }) => desc(log.date),
        with: {
          user: {
            columns: {
              name: true,
            },
          },
        },
      });
      return logs;
    }),
});
