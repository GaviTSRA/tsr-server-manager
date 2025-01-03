import { z } from "zod";
import { router, serverProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import path from "path";
import fs from "fs";

export const serverFilesRouter = router({
  list: serverProcedure
    .meta({
      permission: "files.read",
    })
    .input(z.object({ path: z.string() }))
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
            message: err
          });
        } else if (err instanceof Error) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: err.message
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
    .mutation(async ({ input }) => {
      if (input.path.includes("..")) {
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      const dir = path.dirname(target);
      const updatedPath = path.join(dir, input.name);
      fs.renameSync(target, updatedPath);
    }),
  edit: serverProcedure
    .meta({
      permission: "files.edit",
    })
    .input(z.object({ path: z.string(), content: z.string() }))
    .mutation(async ({ input }) => {
      if (input.path.includes("..")) {
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      fs.writeFileSync(target, input.content);
    }),
  delete: serverProcedure
    .meta({
      permission: "files.delete",
    })
    .input(z.object({ path: z.string() }))
    .mutation(async ({ input }) => {
      if (input.path.includes("..")) {
        throw new TRPCError({
          code: "FORBIDDEN",
        });
      }
      const root = "servers/" + input.serverId;
      const target = path.normalize(path.join(root, input.path));
      fs.rmSync(target);
    }),
});
