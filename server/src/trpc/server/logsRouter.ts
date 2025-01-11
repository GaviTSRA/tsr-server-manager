import { router, serverProcedure } from "../trpc";

export const limitsRouter = router({
  read: serverProcedure
    .meta({
      permission: "logs.read",
    })
    .query(async ({ ctx }) => {
      const logs = await ctx.db.query.Log.findMany({
        where: (log, { eq }) => eq(log.serverId, ctx.server.id),
        with: {
          user: true
        }
      })
      return logs;
    }),
});
