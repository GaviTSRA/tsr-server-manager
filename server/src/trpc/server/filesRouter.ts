import { array, z } from "zod";
import { log, router, serverProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import path from "path";
import fs from "fs";

export const serverFilesRouter = router({
  list: serverProcedure
    .meta({
      permission: "files.read",
      openapi: { method: "GET", path: "/server/{serverId}/files", protect: true }
    })
    .input(z.object({ path: z.string() }))
    .output(z.union([
      z.object({
        type: z.enum(["folder"]),
        files: z.object({
          name: z.string(),
          type: z.enum(["file", "folder"]),
          lastEdited: z.date(),
          size: z.number()
        }).array()
      }),
      z.object({
        type: z.enum(["file"]),
        content: z.string()
      })
    ]))
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
      openapi: { method: "POST", path: "/server/{serverId}/rename", protect: true }
    })
    .input(z.object({ path: z.string(), name: z.string() }))
    .output(z.void())
    .mutation(async ({ input, ctx }) => {
      if (input.path.includes("..")) {
        log(`Rename file '${input.path}' to '${input.name}'`, false, ctx);
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
        log(`Rename file '${input.path}' to '${input.name}'`, true, ctx);
      } catch (err) {
        console.error(err);
        log(`Rename file '${input.path}' to '${input.name}'`, false, ctx);
      }
    }),
  edit: serverProcedure
    .meta({
      permission: "files.edit",
      openapi: { method: "POST", path: "/server/{serverId}/edit", protect: true }
    })
    .input(z.object({ path: z.string(), content: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      if (input.path.includes("..")) {
        await log(
          `Edit file '${input.path}' with '${input.content}'`,
          false,
          ctx
        );
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      fs.writeFileSync(target, input.content);
      await log(`Edit file '${input.path}'`, true, ctx);
    }),
  delete: serverProcedure
    .meta({
      permission: "files.delete",
      openapi: { method: "DELETE", path: "/server/{serverId}/files", protect: true }
    })
    .input(z.object({ path: z.string() }))
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      if (input.path.includes("..")) {
        await log(`Delete file '${input.path}'`, false, ctx);
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
      await log(`Delete file '${input.path}'`, true, ctx);
    }),
});
