import { inferProcedureInput, inferProcedureOutput } from "@trpc/server";
import { nodeProcedure, router } from "./trpc";
import { z } from "zod";
import { serverFilesRouter } from "./server/filesRouter";
import { startupRouter } from "./server/startupRouter";
import { networkRouter } from "./server/networkRouter";
import { limitsRouter } from "./server/limitsRouter";
import { powerRouter } from "./server/powerRouter";
import { usersRouter } from "./server/usersRouter";
import { logsRouter } from "./server/logsRouter";
import { NodeRouter } from "@tsm/node";

export const serverRouter = router({
  power: powerRouter,
  // files: serverFilesRouter,
  network: networkRouter,
  startup: startupRouter,
  limits: limitsRouter,
  users: usersRouter,
  logs: logsRouter,
  server: nodeProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/server/{nodeId}/{serverId}",
        protect: true,
      },
    })
    .input(z.object({ serverId: z.string() }))
    .output(z.custom<inferProcedureOutput<NodeRouter["server"]["server"]>>())
    .query(async ({ input, ctx }) => {
      return await ctx.node.trpc.server.server.query({
        serverId: input.serverId,
        userId: ctx.user.id,
      });
    }),
  status: nodeProcedure
    .input(z.object({ serverId: z.string() }))
    .output(z.custom<inferProcedureOutput<NodeRouter["server"]["status"]>>())
    .subscription(async function* ({ ctx, input }) {
      const eventQueue: {
        cpuUsage: number;
        ramUsage: number;
        cpuAvailable?: number;
        ramAvailable?: number;
      }[] = [];

      const subscription = ctx.node.trpc.server.status.subscribe(
        {
          serverId: input.serverId,
          userId: ctx.user.id,
        },
        {
          onData(data) {
            eventQueue.push(data);
          },
        }
      );

      try {
        while (true) {
          if (eventQueue.length > 0) {
            const value = eventQueue.shift();
            if (value !== undefined) yield value;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } finally {
        subscription.unsubscribe();
      }
    }),
  consoleLogs: nodeProcedure
    .input(z.object({ serverId: z.string() }))
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["consoleLogs"]>>()
    )
    .subscription(async function* ({ ctx, input }) {
      const eventQueue: string[] = [];

      const subscription = ctx.node.trpc.server.consoleLogs.subscribe(
        {
          serverId: input.serverId,
          userId: ctx.user.id,
        },
        {
          onData(data) {
            eventQueue.push(data);
          },
        }
      );

      try {
        while (true) {
          if (eventQueue.length > 0) {
            yield eventQueue.shift() as string;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } finally {
        subscription.unsubscribe();
      }
    }),
  run: nodeProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/server/{nodeId}/{serverId}/run",
        protect: true,
      },
    })
    .input(
      z.custom<
        Omit<inferProcedureInput<NodeRouter["server"]["run"]>, "userId">
      >()
    )
    .output(z.custom<inferProcedureOutput<NodeRouter["server"]["run"]>>())
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.run.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
});
