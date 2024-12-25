import { User } from "../schema";
import { publicProcedure, router } from "./trpc";
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
    .input(
      z.object({
        name: z.string(),
        password: z.string(),
      })
    )
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
    .input(
      z.object({
        name: z.string(),
        password: z.string(),
      })
    )
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
});
