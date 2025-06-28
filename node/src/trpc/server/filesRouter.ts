import { z } from "zod";
import { authedProcedure, log, router, serverProcedure } from "../trpc.js";
import { TRPCError } from "@trpc/server";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { zfd } from "zod-form-data";

export const serverFilesRouter = router({
  list: serverProcedure
    .meta({
      permission: "files.read",
    })
    .input(z.object({ path: z.string() }))
    .output(
      z.union([
        z.object({
          type: z.enum(["folder"]),
          files: z
            .object({
              name: z.string(),
              type: z.enum(["file", "folder"]),
              lastEdited: z.date(),
              size: z.number(),
            })
            .array(),
        }),
        z.object({
          type: z.enum(["file"]),
          content: z.string(),
        }),
      ])
    )
    .query(async ({ input }) => {
      if (input.path.includes("..")) {
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      try {
        const stats = fs.statSync(target);
        if (!stats.isDirectory()) {
          const content = fs.readFileSync(target).toString();
          return { type: "file" as "file", content };
        }
      } catch (err) {
        if (typeof err === "string") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: err,
          });
        } else if (err instanceof Error) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: err.message,
          });
        }
      }

      const result: {
        name: string;
        type: "file" | "folder";
        lastEdited: Date;
        size: number;
      }[] = [];
      fs.readdirSync(target).map((filename) => {
        const file = path.join(target, filename);
        const stats = fs.lstatSync(file);
        result.push({
          name: filename,
          type: stats.isDirectory() ? "folder" : "file",
          lastEdited: stats.mtime,
          size: stats.size,
        });
      });
      return { type: "folder" as "folder", files: result };
    }),
  rename: serverProcedure
    .meta({
      permission: "files.rename",
    })
    .input(z.object({ path: z.string(), name: z.string() }))
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      if (input.path.includes("..")) {
        log(
          `Rename file '${input.path}' to '${input.name}'`,
          false,
          input.userId,
          ctx
        );
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      const dir = path.dirname(target);
      const updatedPath = path.join(dir, input.name);
      try {
        fs.renameSync(target, updatedPath);
        log(
          `Rename file '${input.path}' to '${input.name}'`,
          true,
          input.userId,
          ctx
        );
      } catch (err) {
        console.error(err);
        log(
          `Rename file '${input.path}' to '${input.name}'`,
          false,
          input.userId,
          ctx
        );
      }
    }),
  create: serverProcedure
    .meta({
      permission: "files.edit",
    })
    .input(z.object({ path: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      if (input.path.includes("..")) {
        await log(`Create file '${input.path}'`, false, input.userId, ctx);
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      fs.writeFileSync(target, "");
      await log(`Create file '${input.path}'`, true, input.userId, ctx);
    }),
  createFolder: serverProcedure
    .meta({
      permission: "files.edit",
    })
    .input(z.object({ path: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      if (input.path.includes("..")) {
        await log(`Create dir '${input.path}'`, false, input.userId, ctx);
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      fs.mkdirSync(target);
      await log(`Create dir '${input.path}'`, true, input.userId, ctx);
    }),
  upload: authedProcedure
    .input(
      zfd.formData({
        userId: zfd.text(),
        path: zfd.text(),
        serverId: zfd.text(),
        file: zfd.file(),
      })
    )
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      // Begin manual server procedure impl
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
      if (server.ownerId !== input.userId) {
        if (
          !server.permissions
            .map((permission) => permission.permission)
            .includes("files.edit")
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: `Missing permission 'files.edit'`,
          });
        }
      }
      // End manual server procedure impl

      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      const filePath = path.join(target, input.file.name);
      try {
        const fd = fs.createWriteStream(filePath);
        const fileStream = Readable.fromWeb(input.file.stream());
        for await (const chunk of fileStream) {
          fd.write(chunk);
        }
        fd.end();
        await log(`Edit file '${input.path}'`, true, input.userId, {
          ...ctx,
          server,
        });
      } catch (error) {
        await log(`Edit file '${input.path}'`, false, input.userId, {
          ...ctx,
          server,
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload file: " + error,
        });
      }
    }),
  edit: serverProcedure
    .meta({
      permission: "files.edit",
    })
    .input(z.object({ path: z.string(), content: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      if (input.path.includes("..")) {
        await log(`Edit file '${input.path}'`, false, input.userId, ctx);
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      fs.writeFileSync(target, input.content);
      await log(`Edit file '${input.path}'`, true, input.userId, ctx);
    }),
  delete: serverProcedure
    .meta({
      permission: "files.delete",
    })
    .input(z.object({ path: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      if (input.path.includes("..")) {
        await log(`Delete file '${input.path}'`, false, input.userId, ctx);
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      if (fs.statSync(target).isDirectory()) {
        fs.rmdirSync(target);
      } else {
        fs.rmSync(target);
      }
      await log(`Delete file '${input.path}'`, true, input.userId, ctx);
    }),
});
