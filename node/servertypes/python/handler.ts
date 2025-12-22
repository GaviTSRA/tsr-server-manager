import { z } from "zod";
import {
  getServer,
  sendEmbed,
  setMetadata,
  type PlatformEvent,
} from "../../src/events";

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
      break;

    case "log":
      break;
  }
}
