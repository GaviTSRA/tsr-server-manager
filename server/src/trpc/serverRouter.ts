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
import { handleNodeError } from "../nodes";
import { customRouter } from "./server/customRouter";

export const serverRouter = router({
  power: powerRouter,
  files: serverFilesRouter,
  network: networkRouter,
  startup: startupRouter,
  limits: limitsRouter,
  users: usersRouter,
  logs: logsRouter,
  custom: customRouter,
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
      try {
        return await ctx.node.trpc.server.server.query({
          serverId: input.serverId,
          userId: ctx.user.id,
        });
      } catch (err) {
        throw await handleNodeError(ctx.node, err);
      }
    }),
  status: nodeProcedure
    .input(z.object({ serverId: z.string() }))
    .output(z.custom<inferProcedureOutput<NodeRouter["server"]["status"]>>())
    .query(async ({ ctx, input }) => {
      return ctx.node.trpc.server.status.query({
        serverId: input.serverId,
        userId: ctx.user.id,
      });
    }),
  consoleLogs: nodeProcedure
    .input(z.object({ serverId: z.string() }))
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["consoleLogs"]>>()
    )
    .subscription(async function* ({ ctx, input }) {
      const eventQueue: string[] = [];

      let subscription;
      try {
        subscription = ctx.node.trpc.server.consoleLogs.subscribe(
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
      } catch (err) {
        throw await handleNodeError(ctx.node, err);
      }

      try {
        while (true) {
          if (eventQueue.length > 0) {
            yield eventQueue.shift() as string;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } catch (err) {
        throw await handleNodeError(ctx.node, err);
      } finally {
        try {
          subscription.unsubscribe();
        } catch (err) {}
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
      try {
        return await ctx.node.trpc.server.run.mutate({
          ...input,
          userId: ctx.user.id,
        });
      } catch (err) {
        throw await handleNodeError(ctx.node, err);
      }
    }),
});
