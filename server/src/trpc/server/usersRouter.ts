import { and, eq, inArray } from "drizzle-orm";
import { Permission } from "../..";
import { Permission as PermissionTable } from "../../schema";
import { hasPermission, router, serverProcedure } from "../trpc";
import { z } from "zod";

export const usersRouter = router({
  read: serverProcedure
    .meta({
      permission: "users.read"
    })
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.query.User.findMany({
        with: {
          permissions: {
            where: (permission, { eq, or }) => or(
              eq(permission.serverId, ctx.server.id),
              eq(permission.userId, ctx.server.ownerId)
            ),
            columns: {
              permission: true
            }
          }
        }
      });
      const finalUsers = [] as {
        id: string;
        name: string;
        permissions: Permission[];
        owner: boolean;
        self: boolean;
      }[];
      for (const user of users) {
        const permissions = user.permissions.map(permission => permission.permission) as Permission[];
        const owner = user.id === ctx.server.ownerId;
        if (!permissions.includes("server") && !owner) continue;
        finalUsers.push({
          id: user.id,
          name: user.name,
          permissions,
          owner,
          self: user.id === ctx.user.id
        });
      }
      return finalUsers;
    }),
  writePermissions: serverProcedure
    .meta({
      permission: "users.write"
    })
    .input(z.object({
      userId: z.string(),
      addPermissions: z.string().array(),
      removePermissions: z.string().array()
    }))
    .mutation(async ({ ctx, input }) => {
      const addPermissions = [] as string[];
      const removePermissions = [] as string[];

      for (const permission of input.addPermissions) {
        let canAdd = ctx.user.id === ctx.server.ownerId;
        if (!canAdd) {
          canAdd = await hasPermission(ctx, ctx.user.id, ctx.server, permission);
        }
        if (canAdd) {
          addPermissions.push(permission);
        }
      }

      for (const permission of input.removePermissions) {
        let canRemove = ctx.user.id === ctx.server.ownerId;
        if (!canRemove) {
          canRemove = await hasPermission(ctx, ctx.user.id, ctx.server, permission);
        }
        if (canRemove) {
          removePermissions.push(permission);
        }
      }
      console.info(addPermissions)

      if (addPermissions.length > 0) {
        await ctx.db.insert(PermissionTable).values(addPermissions.map(permission => ({
          userId: input.userId,
          serverId: ctx.server.id,
          permission
        }))).onConflictDoNothing();
      }

      await ctx.db.delete(PermissionTable).where(and(
        eq(PermissionTable.serverId, ctx.server.id),
        eq(PermissionTable.userId, input.userId),
        inArray(PermissionTable.permission, removePermissions)
      ));
    }),
  addUser: serverProcedure
    .meta({
      permission: "users.write",
    })
    .input(z.object({
      userId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(PermissionTable).values({
        userId: input.userId,
        serverId: ctx.server.id,
        permission: "server"
      });
    }),
  deleteUser: serverProcedure
    .meta({
      permission: "users.write"
    })
    .input(z.object({
      userId: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(PermissionTable).where(
        and(
          eq(PermissionTable.userId, input.userId),
          eq(PermissionTable.serverId, ctx.server.id)
        )
      )
    })
})