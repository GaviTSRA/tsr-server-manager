import { and, eq, inArray } from "drizzle-orm";
import { Permission, AssignedPermission } from "../../schema";
import { hasPermission, log, router, serverProcedure } from "../trpc";
import { z } from "zod";

export const usersRouter = router({
  permissions: serverProcedure.query(async ({ ctx }) => {
    return await ctx.db.query.Permission.findMany({
      where: (Permission, { or, eq }) =>
        or(
          eq(Permission.serverType, "default"),
          eq(Permission.serverType, ctx.server.type)
        ),
    });
  }),
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
        permissions: string[];
        owner: boolean;
        self: boolean;
      }[];
      for (const user of users) {
        const permissions = user.permissions.map(
          (permission) => permission.permission
        );
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
        editUserId: z.string(),
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
          .insert(AssignedPermission)
          .values(
            addPermissions.map((permission) => ({
              userId: input.editUserId,
              serverId: ctx.server.id,
              permission,
            }))
          )
          .onConflictDoNothing();
      }

      await ctx.db
        .delete(AssignedPermission)
        .where(
          and(
            eq(AssignedPermission.serverId, ctx.server.id),
            eq(AssignedPermission.userId, input.editUserId),
            inArray(AssignedPermission.permission, removePermissions)
          )
        );
      const user = await ctx.db.query.User.findFirst({
        where: (user, { eq }) => eq(user.id, input.editUserId),
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
          `Update permissions of user ${input.editUserId}: ${addedPermissions}${removedPermissions}`,
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
        newUserId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.insert(AssignedPermission).values({
        userId: input.newUserId,
        serverId: ctx.server.id,
        permission: "server",
      });
      const user = await ctx.db.query.User.findFirst({
        where: (user, { eq }) => eq(user.id, input.newUserId),
      });
      if (user) {
        await log(`Added user ${user.name} to server`, true, input.userId, ctx);
      } else {
        await log(
          `Added user ${input.newUserId} to server`,
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
        deleteUserId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(AssignedPermission)
        .where(
          and(
            eq(AssignedPermission.userId, input.deleteUserId),
            eq(AssignedPermission.serverId, ctx.server.id)
          )
        );
      const user = await ctx.db.query.User.findFirst({
        where: (user, { eq }) => eq(user.id, input.deleteUserId),
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
          `Removed user ${input.deleteUserId} from server`,
          true,
          input.userId,
          ctx
        );
      }
    }),
});
