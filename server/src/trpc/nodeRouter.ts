import { authedProcedure, router } from "./trpc";
import { z } from "zod";

const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("SECRET_KEY is not set");
}

export const nodeRouter = router({
  list: authedProcedure
    .meta({ openapi: { method: "GET", path: "/nodes/list", protect: true } })
    .input(z.void())
    .output(
      z
        .object({
          id: z.string(),
          name: z.string(),
          url: z.string(),
        })
        .array()
    )
    .query(({ ctx }) => {
      return ctx.db.query.Node.findMany({
        columns: {
          id: true,
          name: true,
          url: true,
        },
      });
    }),
});
