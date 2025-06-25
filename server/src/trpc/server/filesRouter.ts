import { z } from "zod";
import { nodeProcedure, router } from "../trpc";
import { inferProcedureInput, inferProcedureOutput } from "@trpc/server";
import { NodeRouter } from "@tsm/node";

export const serverFilesRouter = router({
  list: nodeProcedure
    .meta({
      openapi: {
        method: "GET",
        path: "/server/{serverId}/files",
        protect: true,
      },
    })
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["files"]["list"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["files"]["list"]>>()
    )
    .query(async ({ input, ctx }) => {
      return await ctx.node.trpc.server.files.list.query({
        ...input,
        userId: ctx.user.id,
      });
    }),
  rename: nodeProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/server/{serverId}/rename",
        protect: true,
      },
    })
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["files"]["rename"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["files"]["rename"]>>()
    )
    .mutation(async ({ input, ctx }) => {
      return await ctx.node.trpc.server.files.rename.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
  create: nodeProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/server/{serverId}/create",
        protect: true,
      },
    })
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["files"]["create"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["files"]["create"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.files.create.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
  createFolder: nodeProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/server/{serverId}/createFolder",
        protect: true,
      },
    })
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["files"]["createFolder"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<
        inferProcedureOutput<NodeRouter["server"]["files"]["createFolder"]>
      >()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.files.createFolder.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
  upload: nodeProcedure
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["files"]["upload"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["files"]["upload"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      // const formData = new FormData();
      // for (const entry of input.entries) {
      //   formData.append(entry[0], entry[1]);
      // }
      // formData.append("userId", ctx.user.id);
      // return await ctx.node.trpc.server.files.upload.mutate({
      //   ...input,
      // });
    }),
  edit: nodeProcedure
    .meta({
      openapi: {
        method: "POST",
        path: "/server/{serverId}/edit",
        protect: true,
      },
    })
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["files"]["edit"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["files"]["edit"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.files.edit.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
  delete: nodeProcedure
    .meta({
      openapi: {
        method: "DELETE",
        path: "/server/{serverId}/files",
        protect: true,
      },
    })
    .input(
      z.custom<
        Omit<
          inferProcedureInput<NodeRouter["server"]["files"]["delete"]>,
          "userId"
        >
      >()
    )
    .output(
      z.custom<inferProcedureOutput<NodeRouter["server"]["files"]["delete"]>>()
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.node.trpc.server.files.delete.mutate({
        ...input,
        userId: ctx.user.id,
      });
    }),
});
