import { hasPermission } from "./trpc/trpc";
import * as docker from "./docker";
import { db } from ".";
import { ServerStat } from "./schema";
import { and, eq, lt } from "drizzle-orm";

export async function watchStats(
  serverId: string,
  containerId: string,
  cpuCount: number
) {
  await db
    .delete(ServerStat)
    .where(
      and(
        eq(ServerStat.serverId, serverId),
        lt(ServerStat.date, new Date(Date.now() - 1000 * 60 * 60))
      )
    );

  const result = docker.containerStats(containerId);
  try {
    let previousNetworkIn = 0;
    let previousNetworkOut = 0;

    for await (const part of result) {
      let networkIn = part.networkIn;
      let networkOut = part.networkOut;

      if (previousNetworkIn <= networkIn) networkIn -= previousNetworkIn;
      if (previousNetworkOut <= networkOut) networkOut -= previousNetworkOut;

      previousNetworkIn = part.networkIn;
      previousNetworkOut = part.networkOut;

      await db.insert(ServerStat).values({
        date: new Date(),
        serverId,
        cpuUsage: part.cpuUsage,
        cpuCount,
        ramUsage: part.ramUsage,
        ramAvailable: part.ramAvailable,
        // TODO
        diskUsage: 0,
        networkIn: networkIn,
        networkOut: networkOut,
      });
    }
  } catch (error) {
    console.error("Error during iteration:", error);
  }
}
