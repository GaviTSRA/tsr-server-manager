import * as schema from "./schema";
import { db, serverTypes } from ".";
import { eq } from "drizzle-orm";
import axios from "axios";

export type PlatformEvent =
  | {
      type: "power";
      data: "start" | "restart" | "stop" | "kill";
      serverId: string;
    }
  | {
      type: "log";
      data: string;
      serverId: string;
    };

export async function emitPowerEvent(
  serverId: string,
  action: "start" | "restart" | "stop" | "kill"
) {
  const event = {
    type: "power" as "power",
    data: action,
    serverId,
  };
  const server = await getServer(event);
  await emitEvent(server.type, event);
}
export async function emitLogEvent(
  serverId: string,
  log: string,
  type: string
) {
  await emitEvent(type, {
    type: "log",
    data: log,
    serverId,
  });
}

async function emitEvent(type: string, event: PlatformEvent) {
  const serverType = serverTypes.find((entry) => entry.id === type);
  if (!serverType) {
    console.error("Server type not found:", type);
    return;
  }
  if (!serverType.eventHandler) return;
  await serverType.eventHandler(event);
}

export async function setMetadata(
  serverId: string,
  data: { [key: string]: any }
) {
  await db
    .update(schema.Server)
    .set({
      metadata: data,
    })
    .where(eq(schema.Server.id, serverId));
}

export async function getServer(event: PlatformEvent) {
  const server = await db.query.Server.findFirst({
    where: (server, { eq }) => eq(server.id, event.serverId),
  });
  if (!server) {
    throw new Error("Server not found");
  }
  return server;
}

export async function sendEmbed(webhook: string, title: string, color: number) {
  await axios.post(webhook, {
    content: null,
    embeds: [
      {
        title,
        color,
      },
    ],
  });
}
