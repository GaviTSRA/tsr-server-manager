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

export async function handleEvent(event: PlatformEvent) {}
