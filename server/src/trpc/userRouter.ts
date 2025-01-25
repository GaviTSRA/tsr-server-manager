import { User } from "../schema";
import { authedProcedure, publicProcedure, router } from "./trpc";
import { z } from "zod";
import bcrypt from "bcrypt";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("SECRET_KEY is not set");
}

export const userRouter = router({
  register: publicProcedure
    .meta({ openapi: { method: "POST", path: "/users/register", protect: false } })
    .input(
      z.object({
        name: z.string(),
        password: z.string(),
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.User.findFirst({
        where: (user, { eq }) => eq(user.name, input.name),
      });
      if (user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already exists",
        });
      }
      const hashedPassword = await bcrypt.hash(input.password, 10);
      await ctx.db.insert(User).values({
        name: input.name,
        password: hashedPassword,
      });
    }),
  login: publicProcedure
    .meta({ openapi: { method: "POST", path: "/users/login", protect: false } })
    .input(
      z.object({
        name: z.string(),
        password: z.string(),
      })
    )
    .output(z.string())
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.query.User.findFirst({
        where: (user, { eq }) => eq(user.name, input.name),
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }
      if (!(await bcrypt.compare(input.password, user.password))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid password",
        });
      }

      const token = jwt.sign({ id: user.id }, SECRET_KEY);
      return token;
    }),
  list: authedProcedure
    .meta({ openapi: { method: "GET", path: "/users/list", protect: true } })
    .input(z.void())
    .output(z.object({
      id: z.string(),
      name: z.string()
    }).array())
    .query(({ ctx }) => {
      return ctx.db.query.User.findMany({
        columns: {
          id: true,
          name: true,
        }
      });
    })
});
