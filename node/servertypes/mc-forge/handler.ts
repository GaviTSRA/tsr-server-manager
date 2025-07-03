import { z } from "zod";
import {
  getServer,
  sendEmbed,
  setMetadata,
  type PlatformEvent,
} from "../../src/events.js";

const dataSchema = z.object({
  players: z.string().array().optional(),
});
type Metadata = z.infer<typeof dataSchema>;

async function update(serverId: string, metadata: Metadata) {
  await setMetadata(serverId, metadata);
}

async function getMetadata(event: PlatformEvent) {
  const server = await getServer(event);
  return dataSchema.parse(server.metadata);
}

function justHappened(time: string) {
  const now = new Date();
  const [hours, minutes, seconds] = time.split(":").map(Number);
  const givenDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    seconds
  );
  const givenTimestamp = givenDate.getTime() / 1000;
  const currentTimestamp = Date.now() / 1000;
  return Math.abs(currentTimestamp - givenTimestamp) <= 10;
}

export async function handleEvent(event: PlatformEvent) {
  switch (event.type) {
    case "power":
      const server = await getServer(event);
      const metadata = dataSchema.parse(server.metadata);
      await update(event.serverId, {
        ...metadata,
        players: [],
      });
      if (server.options.notifyWebhook) {
        const title =
          event.data === "start"
            ? "Server is now starting..."
            : event.data === "kill"
            ? "Server is now offline!"
            : "Server is now stopping...";
        const color = event.data === "start" ? 13369291 : 16711680;
        sendEmbed(server.options.notifyWebhook, title, color);
      }

      break;

    case "log":
      const serverOnline =
        /\[(\d\d:\d\d:\d\d)] \[Server thread\/INFO\] \[minecraft\/DedicatedServer\]: Done \(([0-9.]+)s\)!/;
      const serverOffline =
        /\[(\d\d:\d\d:\d\d)] \[Server thread\/INFO\] \[minecraft\/DedicatedServer\]: Done \(([0-9.]+)s\)!/;
      const join =
        /\[(\d\d:\d\d:\d\d)] \[Server thread\/INFO] \[minecraft\/MinecraftServer]: ([\w]+) joined the game/;
      const leave =
        /\[(\d\d:\d\d:\d\d)] \[Server thread\/INFO] \[minecraft\/MinecraftServer]: ([\w]+) left the game/;

      const joinMatch = join.exec(event.data);
      const leaveMatch = leave.exec(event.data);
      const serverOnlineMatch = serverOnline.exec(event.data);
      const serverOfflineMatch = serverOffline.exec(event.data);

      if (serverOnlineMatch && serverOnlineMatch[1] && serverOnlineMatch[2]) {
        const server = await getServer(event);
        const metadata = dataSchema.parse(server.metadata);
        update(event.serverId, {
          ...metadata,
          players: [],
        });
        if (
          server.options.notifyWebhook &&
          justHappened(serverOnlineMatch[1])
        ) {
          sendEmbed(
            server.options.notifyWebhook,
            `Server is now online! Started in ${serverOnlineMatch[2]}s`,
            5151822
          );
        }
      }

      if (
        serverOfflineMatch &&
        serverOfflineMatch[1] &&
        serverOfflineMatch[2]
      ) {
        const server = await getServer(event);
        if (
          server.options.notifyWebhook &&
          justHappened(serverOfflineMatch[1])
        ) {
          sendEmbed(
            server.options.notifyWebhook,
            `Server is now stopped!`,
            5151822
          );
        }
      }

      if (joinMatch && joinMatch[1] && joinMatch[2]) {
        const server = await getServer(event);
        const metadata = dataSchema.parse(server.metadata);
        const players = metadata.players ?? [];
        players.push(joinMatch[2]);
        update(event.serverId, {
          ...metadata,
          players,
        });
        if (server.options.notifyWebhook && justHappened(joinMatch[1])) {
          sendEmbed(
            server.options.notifyWebhook,
            `${joinMatch[2]} joined the game`,
            7246967
          );
        }
      }

      if (leaveMatch && leaveMatch[1] && leaveMatch[2]) {
        const server = await getServer(event);
        const metadata = dataSchema.parse(server.metadata);
        const players = metadata.players ?? [];
        update(event.serverId, {
          ...metadata,
          players: players.filter((p) => p !== leaveMatch[2]),
        });
        if (server.options.notifyWebhook && justHappened(leaveMatch[1])) {
          sendEmbed(
            server.options.notifyWebhook,
            `${leaveMatch[2]} left the game`,
            11470856
          );
        }
      }
      break;
  }
}
