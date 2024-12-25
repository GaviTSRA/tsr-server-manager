import { z } from "zod";
import { authedProcedure, publicProcedure, router } from "./trpc";
import { TRPCError } from "@trpc/server";
import path from "path";
import fs from "fs";

export const serverFilesRouter = router({
  list: authedProcedure
    .input(z.object({ path: z.string(), serverId: z.string() }))
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
        console.info(err);
        throw new TRPCError({
          code: "NOT_FOUND",
        });
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
  rename: authedProcedure
    .input(
      z.object({ path: z.string(), name: z.string(), serverId: z.string() })
    )
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
  edit: authedProcedure
    .input(
      z.object({ path: z.string(), serverId: z.string(), content: z.string() })
    )
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
  delete: authedProcedure
    .input(z.object({ path: z.string(), serverId: z.string() }))
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
