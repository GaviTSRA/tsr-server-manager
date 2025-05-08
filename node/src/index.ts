import { emitLogEvent, PlatformEvent } from "./events";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import * as docker from "./docker";
import fs from "fs";
import "dotenv/config";
import { nodeRouter } from "./trpc/router";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { createContext } from "./trpc/trpc";
import http from "http";
import cors from "cors";
import { watchStats } from "./stats";
import compression from "compression";
import { loadServerTypes } from "./serverTypes";
import { registerDefaultPermissions } from "./permissions";

export const db = drizzle(process.env.DATABASE_URL!, { schema });
export type { NodeRouter } from "./trpc/router";

registerDefaultPermissions(db);
export const serverTypes = loadServerTypes(db);

const customImages = [] as string[];
fs.readdirSync("images").forEach((folder) => {
  console.info("Building image " + folder);
  const data = fs.readFileSync(`images/${folder}/Dockerfile`).toString();
  customImages.push(folder);
  // docker.buildImage(folder, data); TODO
});

const requiredImages = [] as string[];
serverTypes.forEach((type) => {
  if (
    type.image &&
    !requiredImages.includes(type.image) &&
    !customImages.includes(type.image)
  )
    requiredImages.push(type.image);
  if (type.options["image"]) {
    type.options["image"].options?.forEach((image) => {
      if (!requiredImages.includes(image) && !customImages.includes(image))
        requiredImages.push(image);
    });
  }
});
docker.getImages().then(({ data: downloadedImages, status }) => {
  if (!downloadedImages) {
    console.error("Failed to download images", status);
    return;
  }
  requiredImages.forEach((image) => {
    if (!downloadedImages.includes(image)) {
      console.info("Downloading image " + image);
      docker.downloadImage(image);
    }
  });
});

db.query.Server.findMany().then((servers) => {
  for (const server of servers) {
    if (server.containerId) {
      docker.inspectContainer(server.containerId).then(async (result) => {
        if (result.status === "success" && result.data?.status === "running") {
          console.info("Restarting watcher for", server.name);
          watchStats(server.id, server.containerId as string, server.cpuLimit);
          const res = await docker.attachToContainer(server.containerId ?? "");
          const asyncIterable = docker.createAsyncIterable(res.data);
          for await (const chunk of asyncIterable) {
            const data = chunk.toString() as string;
            data.split("\n").map(async (log) => {
              await emitLogEvent(server.id, log, server.type);
            });
          }
        }
      });
    }
  }
});

const app = express();
app.use(cors());
app.use(compression());
app.use("/", createExpressMiddleware({ router: nodeRouter, createContext }));
const server = http.createServer({}, app);
server.listen(8771);
