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
  // power: powerRouter,
  // files: serverFilesRouter,
  // network: networkRouter,
  // startup: startupRouter,
  // limits: limitsRouter,
  // users: usersRouter,
  // logs: logsRouter,
  server: nodeProcedure
    .meta({
      openapi: { method: "GET", path: "/server/{serverId}", protect: true },
    })
    .input(z.custom<inferProcedureInput<NodeRouter["server"]["server"]>>())
    .output(z.custom<inferProcedureOutput<NodeRouter["server"]["server"]>>())
    .query(async ({ input, ctx }) => {
      return await ctx.node.trpc.server.server.query(input);
    }),
  // status: serverProcedure
  //   .meta({
  //     permission: "status",
  //   })
  //   .subscription(async function* ({ ctx, input }) {
  //     if (!ctx.server.containerId) {
  //       throw new TRPCError({
  //         code: "BAD_REQUEST",
  //         message: "Server not installed",
  //       });
  //     }
  //     const result = docker.containerStats(ctx.server.containerId);
  //     const hasLimitPermission = await hasPermission(
  //       ctx,
  //       ctx.user.id,
  //       ctx.server,
  //       "limits.read"
  //     );
  //     try {
  //       for await (const part of result) {
  //         yield {
  //           cpuUsage: part.cpuUsage,
  //           cpuAvailable: hasLimitPermission ? ctx.server.cpuLimit : undefined,
  //           ramUsage: part.ramUsage,
  //           ramAvailable: hasLimitPermission ? part.ramAvailable : undefined,
  //         };
  //       }
  //     } catch (error) {
  //       console.error("Error during iteration:", error);
  //     }
  //   }),
  // consoleLogs: serverProcedure
  //   .meta({
  //     permission: "console.read",
  //   })
  //   .subscription(async function* ({ ctx, input }) {
  //     if (!ctx.server.containerId) {
  //       return;
  //     }

  //     try {
  //       const res = await docker.attachToContainer(ctx.server.containerId);
  //       const asyncIterable = docker.createAsyncIterable(res.data);

  //       for await (const chunk of asyncIterable) {
  //         yield chunk.toString() as string;
  //       }
  //     } catch (error) {
  //       console.error("Error connecting to Docker API:", error);
  //       throw new TRPCError({
  //         code: "INTERNAL_SERVER_ERROR",
  //         message: "Failed to connect to Docker API",
  //       });
  //     }
  //   }),
  run: nodeProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/server/{serverId}/run",
        protect: true,
      },
    })
    .input(z.custom<inferProcedureInput<NodeRouter["server"]["run"]>>())
    .output(z.custom<inferProcedureOutput<NodeRouter["server"]["run"]>>())
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.run.mutate(input);
    }),
});
