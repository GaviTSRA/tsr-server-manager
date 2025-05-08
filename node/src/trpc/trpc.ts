import {
  inferProcedureBuilderResolverOptions,
  initTRPC,
  TRPCError,
} from "@trpc/server";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../schema";
import { z } from "zod";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import jwt from "jsonwebtoken";
import SuperJSON from "superjson";

const PASSWORD = process.env.PASSWORD;
if (!PASSWORD) {
  throw new Error("PASSWORD is not set");
}

export const createContext = async ({
  req,
  info,
}: CreateExpressContextOptions) => {
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
  permission?: string;
  log?: string;
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
    transformer: SuperJSON,
  });

export const router = t.router;
export const publicProcedure = t.procedure;
export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No token provided",
    });
  }
  try {
    const res = jwt.verify(ctx.token, PASSWORD) as {
      id: string;
    };
    return next();
  } catch (e) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Failed to authenticate token",
    });
  }
});
export const serverProcedure = authedProcedure
  .input(z.object({ userId: z.string(), serverId: z.string() }))
  .use(async ({ ctx, input, next, meta }) => {
    const server = await ctx.db.query.Server.findFirst({
      where: (server, { eq }) => eq(server.id, input.serverId),
      with: {
        permissions: {
          where: (permission, { eq }) => eq(permission.userId, input.userId),
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
      server.ownerId !== input.userId &&
      !server.permissions
        .map((permission) => permission.permission)
        .includes("server")
    ) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Missing permission 'server'",
      });
    }
    if (meta && meta.permission && server.ownerId !== input.userId) {
      if (
        !server.permissions
          .map((permission) => permission.permission)
          .includes(meta.permission)
      ) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: `Missing permission '${meta.permission}'`,
        });
      }
    }
    return next({
      ctx: {
        server,
      },
    });
  });

type ServerContext = inferProcedureBuilderResolverOptions<
  typeof serverProcedure
>["ctx"];

export async function log(
  log: string,
  success: boolean,
  userId: string,
  ctx: ServerContext
) {
  await ctx.db.insert(schema.Log).values({
    serverId: ctx.server.id,
    userId,
    log,
    success,
    date: new Date(),
  });
}

export async function hasPermission(
  ctx: Context,
  userId: string,
  server: schema.ServerType,
  permission: string
) {
  if (server.ownerId === userId) return true;
  const result = await ctx.db.query.AssignedPermission.findFirst({
    where: (AssignedPermission, { and, eq }) =>
      and(
        eq(AssignedPermission.permission, permission),
        eq(AssignedPermission.userId, userId),
        eq(AssignedPermission.serverId, server.id)
      ),
  });
  return result !== undefined;
}
