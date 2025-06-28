import fs from "fs";
import { PlatformEvent } from "./events.js";
import { Permission, registerPermissions } from "./permissions.js";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

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
