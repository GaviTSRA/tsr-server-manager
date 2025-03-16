import { and, eq, inArray } from "drizzle-orm";
import { Permission } from "../..";
import { Permission as PermissionTable } from "../../schema";
import { hasPermission, log, router, serverProcedure } from "../trpc";
import { z } from "zod";

// TODO openapi
export const usersRouter = router({
  read: serverProcedure
    .meta({
      permission: "users.read",
    })
    .query(async ({ ctx, input }) => {
      const users = await ctx.db.query.User.findMany({
        with: {
          permissions: {
            where: (permission, { eq, or }) =>
              or(
                eq(permission.serverId, ctx.server.id),
                eq(permission.userId, ctx.server.ownerId)
              ),
            columns: {
              permission: true,
            },
          },
        },
      });
      const finalUsers = [] as {
        id: string;
        name: string;
        permissions: Permission[];
        owner: boolean;
        self: boolean;
      }[];
      for (const user of users) {
        const permissions = user.permissions.map(
          (permission) => permission.permission
        ) as Permission[];
        const owner = user.id === ctx.server.ownerId;
        if (!permissions.includes("server") && !owner) continue;
        finalUsers.push({
          id: user.id,
          name: user.name,
          permissions,
          owner,
          self: user.id === input.userId,
        });
      }
      return finalUsers;
    }),
  writePermissions: serverProcedure
    .meta({
      permission: "users.write",
    })
    .input(
      z.object({
        userId: z.string(),
        addPermissions: z.string().array(),
        removePermissions: z.string().array(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const addPermissions = [] as string[];
      const removePermissions = [] as string[];

      for (const permission of input.addPermissions) {
        let canAdd = input.userId === ctx.server.ownerId;
        if (!canAdd) {
          canAdd = await hasPermission(
            ctx,
            input.userId,
            ctx.server,
            permission
          );
        }
        if (canAdd) {
          addPermissions.push(permission);
        }
      }

      for (const permission of input.removePermissions) {
        let canRemove = input.userId === ctx.server.ownerId;
        if (!canRemove) {
          canRemove = await hasPermission(
            ctx,
            input.userId,
            ctx.server,
            permission
          );
        }
        if (canRemove) {
          removePermissions.push(permission);
        }
      }

      if (addPermissions.length > 0) {
        await ctx.db
          .insert(PermissionTable)
          .values(
            addPermissions.map((permission) => ({
              userId: input.userId,
              serverId: ctx.server.id,
              permission,
            }))
          )
          .onConflictDoNothing();
      }

      await ctx.db
        .delete(PermissionTable)
        .where(
          and(
            eq(PermissionTable.serverId, ctx.server.id),
            eq(PermissionTable.userId, input.userId),
            inArray(PermissionTable.permission, removePermissions)
          )
        );
      const user = await ctx.db.query.User.findFirst({
        where: (user, { eq }) => eq(user.id, input.userId),
      });

      const addedPermissions =
        addPermissions.length > 0 ? `Add ${addPermissions.join(", ")} ` : "";
      const removedPermissions =
        removePermissions.length > 0
          ? `Remove ${removePermissions.join(", ")}`
          : "";

      if (user) {
        await log(
          `Update permissions of user ${user.name}: ${addedPermissions}${removedPermissions}`,
          true,
          input.userId,
          ctx
        );
      } else {
        await log(
          `Update permissions of user ${input.userId}: ${addedPermissions}${removedPermissions}`,
          true,
          input.userId,
          ctx
        );
      }
    }),
  addUser: serverProcedure
    .meta({
      permission: "users.write",
    })
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(PermissionTable).values({
        userId: input.userId,
        serverId: ctx.server.id,
        permission: "server",
      });
      const user = await ctx.db.query.User.findFirst({
        where: (user, { eq }) => eq(user.id, input.userId),
      });
      if (user) {
        await log(`Added user ${user.name} to server`, true, input.userId, ctx);
      } else {
        await log(
          `Added user ${input.userId} to server`,
          true,
          input.userId,
          ctx
        );
      }
    }),
  deleteUser: serverProcedure
    .meta({
      permission: "users.write",
    })
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(PermissionTable)
        .where(
          and(
            eq(PermissionTable.userId, input.userId),
            eq(PermissionTable.serverId, ctx.server.id)
          )
        );
      const user = await ctx.db.query.User.findFirst({
        where: (user, { eq }) => eq(user.id, input.userId),
      });
      if (user) {
        await log(
          `Removed user ${user.name} from server`,
          true,
          input.userId,
          ctx
        );
      } else {
        await log(
          `Removed user ${input.userId} from server`,
          true,
          input.userId,
          ctx
        );
      }
    }),
});
