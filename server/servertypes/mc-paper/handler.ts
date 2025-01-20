import { z } from "zod";
import { getServer, setMetadata, type PlatformEvent } from "../../src/events";

const dataSchema = z.object({
  players: z.string().array().optional(),
});
type Metadata = z.infer<typeof dataSchema>;

async function update(serverId: string, metadata: Metadata) {
  await setMetadata(serverId, metadata);
}

async function getMetadata(event: PlatformEvent) {
  const server = await getServer(event);
  return dataSchema.parse(server);
}

export async function handleEvent(event: PlatformEvent) {
  switch (event.type) {
    case "power":
      const metadata = await getMetadata(event);
      await update(event.serverId, {
        ...metadata,
        players: [],
      });
      break;

    case "log":
      const serverStart = /Starting org.bukkit.craftbukkit.Main/;
      const join = /\[[0-9:]+ INFO]: \[33m\[93m(\w+) joined the game/;
      const leave = /\[[0-9:]+ INFO]: \[33m\[93m(\w+) left the game/;

      const joinMatch = join.exec(event.data);
      const leaveMatch = leave.exec(event.data);

      if (serverStart.test(event.data)) {
        const metadata = await getMetadata(event);
        update(event.serverId, {
          ...metadata,
          players: [],
        });
      }

      if (joinMatch && joinMatch[1]) {
        const metadata = await getMetadata(event);
        const players = metadata.players ?? [];
        players.push(joinMatch[1]);
        update(event.serverId, {
          ...metadata,
          players,
        });
      }

      if (leaveMatch && leaveMatch[1]) {
        const metadata = await getMetadata(event);
        const players = metadata.players ?? [];
        update(event.serverId, {
          ...metadata,
          players: players.filter((p) => p !== leaveMatch[1]),
        });
      }
      break;
  }
}
