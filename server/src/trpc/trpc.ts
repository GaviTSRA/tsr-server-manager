import { initTRPC, TRPCError } from "@trpc/server";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../schema";
import jwt from "jsonwebtoken";
import { CreateHTTPContextOptions } from "@trpc/server/adapters/standalone";
import { z } from "zod";
import { Permission } from "..";
import { ServerType } from "../schema";

const SECRET_KEY = process.env.SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error("SECRET_KEY is not set");
}

export const createContext = async ({ req, info }: CreateHTTPContextOptions) => {
  let token = null;
  if (req.headers.authorization) {
    token = req.headers.authorization.split(" ")[1];
  } else if (info.connectionParams && info.connectionParams.token) {
    token = info.connectionParams.token;
  }
  const db = drizzle(process.env.DATABASE_URL!, { schema });
  return {
    db,
    token,
  };
};
export type Context = Awaited<ReturnType<typeof createContext>>;
export type Meta = {
  permission?: Permission;
};

export const t = initTRPC
  .context<typeof createContext>()
  .meta<Meta>()
  .create({
    sse: {
      ping: {
        enabled: true,
        intervalMs: 3_000,
      },
      client: {
        reconnectAfterInactivityMs: 5_000,
      },
    },
  });

export const router = t.router;
export const publicProcedure = t.procedure;
export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not logged in"
    });
  }
  try {
    const res = jwt.verify(ctx.token, SECRET_KEY) as {
      id: string;
    };
    const user = await ctx.db.query.User.findFirst({
      where: (user, { eq }) => eq(user.id, res.id),
    });
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not found"
      });
    }
    return next({
      ctx: {
        user,
      },
    });
  } catch (e) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Internal error while validating user"
    });
  }
});
export const serverProcedure = authedProcedure
  .input(z.object({ serverId: z.string() }))
  .use(async ({ ctx, input, next, meta }) => {
    const server = await ctx.db.query.Server.findFirst({
      where: (server, { eq }) => eq(server.id, input.serverId),
      with: {
        permissions: {
          where: (permission, { eq }) => eq(permission.userId, ctx.user.id),
        },
      },
    });
    if (!server) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Server not found",
      });
    }
    if (
      server.ownerId !== ctx.user.id &&
      !server.permissions
        .map((permission) => permission.permission)
        .includes("server")
    ) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Missing permission 'server'"
      });
    }
    if (meta && meta.permission && server.ownerId !== ctx.user.id) {
      if (
        !server.permissions
          .map((permission) => permission.permission)
          .includes(meta.permission)
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Missing permission '${meta.permission}'`
        });
      }
    }
    return next({
      ctx: {
        server,
      },
    });
  });

export async function hasPermission(ctx: Context, userId: string, server: ServerType, permission: string) {
  if (server.ownerId === userId) return true;
  const result = await ctx.db.query.Permission.findFirst({
    where: (permissionTable, { and, eq }) => and(
      eq(permissionTable.permission, permission),
      eq(permissionTable.userId, userId),
      eq(permissionTable.serverId, server.id)
    )
  });
  return result !== undefined;
}