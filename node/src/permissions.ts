import { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

export type Permission = {
  id: string;
  name: string;
  description: string;
};

export function registerPermissions(
  permissions: Permission[],
  db: NodePgDatabase<typeof schema>,
  serverType: string
) {
  permissions.forEach(async (permission) => {
    await db
      .insert(schema.Permission)
      .values({
        ...permission,
        serverType,
      })
      .onConflictDoNothing();
  });
}

export function registerDefaultPermissions(db: NodePgDatabase<typeof schema>) {
  registerPermissions(
    [
      {
        id: "server",
        name: "Server Access",
        description: "Grants access to the server",
      },
      {
        id: "status",
        name: "Status",
        description: "Allows viewing the servers resource status",
      },
      {
        id: "power",
        name: "Power",
        description: "Allows changing the servers power state",
      },
      {
        id: "console.read",
        name: "View Console",
        description: "Allows reading the console",
      },
      {
        id: "console.write",
        name: "Run Console Command",
        description: "Allows running commands in the console",
      },
      {
        id: "files.read",
        name: "View files",
        description: "Allows reading files",
      },
      {
        id: "files.rename",
        name: "Rename files",
        description: "Allows renaming files",
      },
      {
        id: "files.edit",
        name: "Edit files",
        description: "Allows editing files",
      },
      {
        id: "files.delete",
        name: "Delete files",
        description: "Allow deleting files",
      },
      {
        id: "network.read",
        name: "View Network Config",
        description: "Allows viewing the network configuration",
      },
      {
        id: "network.write",
        name: "Update Network Config",
        description: "Allows updating the network configuration",
      },
      {
        id: "startup.read",
        name: "View Startup Config",
        description: "Allows reading the startup configuration",
      },
      {
        id: "startup.write",
        name: "Update Startup Config",
        description: "Allows updating the startup configuration",
      },
      {
        id: "limits.read",
        name: "View Limits",
        description: "Allows reading the limit configuration",
      },
      {
        id: "limits.write",
        name: "Update Limits",
        description: "Allows updating the limit configuration",
      },
      {
        id: "users.read",
        name: "View Users",
        description: "Allows viewing user permissions",
      },
      {
        id: "users.write",
        name: "Update Users",
        description:
          "Allows adding or removing users and changing their permissions",
      },
      {
        id: "logs.read",
        name: "View Logs",
        description: "Allows viewing the logs",
      },
    ],
    db,
    "default"
  );
}
