import { router, serverProcedure } from "../trpc";

export const logsRouter = router({
  read: serverProcedure
    .meta({
      permission: "logs.read",
    })
    .query(async ({ ctx }) => {
      const logs = await ctx.db.query.Log.findMany({
        where: (log, { eq }) => eq(log.serverId, ctx.server.id),
        orderBy: (log, { desc }) => desc(log.date),
        with: {
          user: {
            columns: {
              name: true
            }
          }
        }
      })
      return logs;
    }),
});
