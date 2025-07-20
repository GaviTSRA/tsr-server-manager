import fs from "fs";
import { PlatformEvent } from "./events.js";
import { Permission, registerPermissions } from "./permissions.js";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
import path from "path";
import { TRPCError } from "@trpc/server";

export type ServerType = {
  id: string;
  icon: string;
  command: string;
  name: string;
  image: string | null;
  options: {
    [id: string]: {
      name: string;
      description: string;
      type: "string" | "enum";
      default: string;
      options?: string[];
    };
  };
  tabs?: string[];
  eventHandler?: (event: PlatformEvent) => Promise<void>;
  permissions?: Permission[];
};

export function loadServerTypes(db: NodePgDatabase<typeof schema>) {
  const serverTypes: ServerType[] = [];

  fs.readdirSync("servertypes").forEach(async (folder) => {
    const json = fs
      .readFileSync(`servertypes/${folder}/manifest.json`)
      .toString();
    const data = JSON.parse(json);

    let imported = await import(`../servertypes/${folder}/handler.ts`);

    if (data.permissions) {
      registerPermissions(data.permissions, db, folder);
    }

    serverTypes.push({
      id: folder,
      ...data,
      eventHandler: imported.handleEvent,
    });
  });

  return serverTypes;
}

export function readFile(serverId: string, filePath: string) {
  const root = "servers/" + serverId;
  const target = path.normalize(path.join(root, filePath));
  try {
    const stats = fs.statSync(target);
    if (stats.isDirectory()) {
      throw new Error("Cannot read a directory as a file");
    }
    return fs.readFileSync(target).toString();
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
    } else {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "An unknown error occurred while reading the file.",
      });
    }
  }
}

export function listFileNames(serverId: string, folder: string, regex: RegExp) {
  const result = [];

  const root = "servers/" + serverId;
  const target = path.normalize(path.join(root, folder));
  const folderContents = fs.readdirSync(target);
  for (const entry of folderContents) {
    const file = path.normalize(path.join(target, entry));
    const stats = fs.statSync(file);
    if (stats.isDirectory()) {
      continue;
    }

    if (regex.test(entry)) {
      result.push(file);
    }
  }

  return result;
}

export function readFiles(serverId: string, folder: string, regex: RegExp) {
  const result: { [fileName: string]: string } = {};

  const root = "servers/" + serverId;
  const target = path.normalize(path.join(root, folder));
  const folderContents = fs.readdirSync(target);
  for (const entry of folderContents) {
    const file = path.normalize(path.join(target, entry));

    const stats = fs.statSync(file);
    if (stats.isDirectory()) {
      continue;
    }

    if (regex.test(entry)) {
      result[entry] = readFile(serverId, file)
    }
  }

  return result;
}