import { z } from "zod";
import { nodeProcedure, router } from "../trpc";
import { inferProcedureInput, inferProcedureOutput } from "@trpc/server";
import { NodeRouter } from "@tsm/node";

export const customRouter = router({
  mcForge: {
    getPlayers: nodeProcedure
      .input(z.object({ serverId: z.string() }))
      .output(
        z.custom<
          inferProcedureOutput<
            NodeRouter["server"]["custom"]["mcForge"]["getPlayers"]
          >
        >()
      )
      .query(async ({ ctx, input }) => {
        return await ctx.node.trpc.server.custom.mcForge.getPlayers.query({
          serverId: input.serverId,
          userId: ctx.user.id,
        });
      }),
    getOps: nodeProcedure
      .input(z.object({ serverId: z.string() }))
      .output(
        z.custom<
          inferProcedureOutput<
            NodeRouter["server"]["custom"]["mcForge"]["getOps"]
          >
        >()
      )
      .query(async ({ ctx, input }) => {
        return await ctx.node.trpc.server.custom.mcForge.getOps.query({
          serverId: input.serverId,
          userId: ctx.user.id,
        });
      }),
    getMods: nodeProcedure
      .input(z.object({ serverId: z.string() }))
      .output(
        z.custom<
          inferProcedureOutput<
            NodeRouter["server"]["custom"]["mcForge"]["getMods"]
          >
        >()
      )
      .query(async ({ ctx, input }) => {
        return await ctx.node.trpc.server.custom.mcForge.getMods.query({
          serverId: input.serverId,
          userId: ctx.user.id,
        });
      }),
  },
  factorio: {
    getInstalledMods: nodeProcedure
      .input(
        z.custom<
          Omit<
            inferProcedureInput<
              NodeRouter["server"]["custom"]["factorio"]["getInstalledMods"]
            >,
            "userId"
          >
        >()
      )
      .output(
        z.custom<
          inferProcedureOutput<
            NodeRouter["server"]["custom"]["factorio"]["getInstalledMods"]
          >
        >()
      )
      .query(async ({ ctx, input }) => {
        return await ctx.node.trpc.server.custom.factorio.getInstalledMods.query(
          {
            ...input,
            serverId: input.serverId,
            userId: ctx.user.id,
          }
        );
      }),
    updateModList: nodeProcedure
      .input(
        z.custom<
          Omit<
            inferProcedureInput<
              NodeRouter["server"]["custom"]["factorio"]["updateModList"]
            >,
            "userId"
          >
        >()
      )
      .output(
        z.custom<
          inferProcedureOutput<
            NodeRouter["server"]["custom"]["factorio"]["updateModList"]
          >
        >()
      )
      .mutation(async ({ ctx, input }) => {
        return await ctx.node.trpc.server.custom.factorio.updateModList.mutate({
          ...input,
          serverId: input.serverId,
          userId: ctx.user.id,
        });
      }),
    searchMods: nodeProcedure
      .input(
        z.custom<
          Omit<
            inferProcedureInput<
              NodeRouter["server"]["custom"]["factorio"]["searchMods"]
            >,
            "userId"
          >
        >()
      )
      .output(
        z.custom<
          inferProcedureOutput<
            NodeRouter["server"]["custom"]["factorio"]["searchMods"]
          >
        >()
      )
      .query(async ({ ctx, input }) => {
        return await ctx.node.trpc.server.custom.factorio.searchMods.query({
          ...input,
          serverId: input.serverId,
          userId: ctx.user.id,
        });
      }),
    installMod: nodeProcedure
      .input(
        z.custom<
          Omit<
            inferProcedureInput<
              NodeRouter["server"]["custom"]["factorio"]["installMod"]
            >,
            "userId"
          >
        >()
      )
      .output(
        z.custom<
          inferProcedureOutput<
            NodeRouter["server"]["custom"]["factorio"]["installMod"]
          >
        >()
      )
      .mutation(async ({ ctx, input }) => {
        return await ctx.node.trpc.server.custom.factorio.installMod.mutate({
          ...input,
          serverId: input.serverId,
          userId: ctx.user.id,
        });
      }),
  },
});
