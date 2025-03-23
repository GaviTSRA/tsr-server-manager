import { authedProcedure, router } from "./trpc";
import { z } from "zod";

export const nodeRouter = router({
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
      });
    }),
});
