import { eq } from "drizzle-orm";
import { authedProcedure, router } from "./trpc";
import { z } from "zod";
import { Node } from "../schema";

export const nodeRouter = router({
  edit: authedProcedure
    .meta({ openapi: { method: "POST", path: "/nodes/edit", protect: true } })
    .input(
      z.object({
        nodeId: z.string(),
        name: z.string().optional(),
        url: z.string().optional(),
        password: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(Node).set(input).where(eq(Node.id, input.nodeId));
    }),
  list: authedProcedure
    .meta({ openapi: { method: "GET", path: "/nodes/list", protect: true } })
    .input(
      z.object({
        connected: z.boolean(),
      })
    )
    .output(
      z
        .object({
          id: z.string(),
          name: z.string(),
          url: z.string(),
          state: z.enum([
            "CONNECTION_ERROR",
            "AUTHENTICATION_ERROR",
            "SYNC_ERROR",
            "CONNECTED",
          ]),
        })
        .array()
    )
    .query(({ ctx, input }) => {
      return ctx.db.query.Node.findMany({
        where: input.connected
          ? (Node, { eq }) => eq(Node.state, "CONNECTED")
          : undefined,
        columns: {
          id: true,
          name: true,
          url: true,
          state: true,
        },
        orderBy: (Node, { asc }) => asc(Node.name),
      });
    }),
});
