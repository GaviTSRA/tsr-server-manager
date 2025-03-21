import { nodeProcedure, router } from "../trpc";
import { z } from "zod";
import { inferProcedureInput, inferProcedureOutput } from "@trpc/server";
import { NodeRouter } from "@tsm/node";

// TODO openapi
export const usersRouter = router({
  read: nodeProcedure
    .meta({})
    .input(z.object({ serverId: z.string() }))
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["users"]["read"]>>()
    )
    .query(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.users.read.query({
        serverId: input.serverId,
        userId: ctx.user.id,
      });
    }),
  writePermissions: nodeProcedure
    .meta({})
    .input(
      z.custom<
        Omit<
          inferProcedureInput<
            NodeRouter["server"]["users"]["writePermissions"]
          >,
          "userId"
        >
      >()
    )
    .output(
      z.custom<
        inferProcedureOutput<NodeRouter["server"]["users"]["writePermissions"]>
      >()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.users.writePermissions.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
  addUser: nodeProcedure
    .meta({})
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["users"]["addUser"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["users"]["addUser"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.users.addUser.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
  deleteUser: nodeProcedure
    .meta({})
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["users"]["deleteUser"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<
        inferProcedureOutput<NodeRouter["server"]["users"]["deleteUser"]>
      >()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.users.deleteUser.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
});
