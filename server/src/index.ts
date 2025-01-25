import fs, { writeFileSync } from "fs";
import * as docker from "./docker";
import "dotenv/config";
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import express from 'express';
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/trpc";
import http from "http";
import https from "https";
import { readFileSync } from "fs";
import { emitLogEvent, PlatformEvent } from "./events";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import cors from "cors";
import { createOpenApiExpressMiddleware, generateOpenApiDocument } from "trpc-to-openapi";

export type { AppRouter } from "./trpc/router";

export const db = drizzle(process.env.DATABASE_URL!, { schema });

export type ServerType = {
  id: string;
  command: string;
  name: string;
  image: string | null;
  options: {
    [id: string]: {
      name: string;
      description: string;
      type: "string" | "enum";
      default: string;
      options: string[] | undefined;
    };
  };
  tabs?: string[];
  eventHandler: (event: PlatformEvent) => Promise<void>;
};

export const serverTypes: ServerType[] = [];
fs.readdirSync("servertypes").forEach(async (folder) => {
  const json = fs
    .readFileSync(`servertypes/${folder}/manifest.json`)
    .toString();
  const data = JSON.parse(json);
  let imported = await import(`../servertypes/${folder}/handler.ts`);
  serverTypes.push({
    id: folder,
    name: data.name,
    image: data.image,
    command: data.command,
    options: data.options,
    tabs: data.tabs,
    eventHandler: imported.handleEvent,
  });
});

const customImages = [] as string[];
fs.readdirSync("images").forEach((folder) => {
  console.info("Building image " + folder);
  const data = fs.readFileSync(`images/${folder}/Dockerfile`).toString();
  customImages.push(folder);
  docker.buildImage(folder, data);
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

export type Permission =
  | "server"
  | "status"
  | "power" // TODO frontend
  | "console.read"
  | "console.write"
  | "files.read"
  | "files.rename" // TODO frontend
  | "files.edit" // TODO frontend
  | "files.delete" // TODO frontend
  | "network.read"
  | "network.write" // TODO frontend
  | "startup.read"
  | "startup.write"
  | "limits.read"
  | "limits.write"
  | "users.read"
  | "users.write"
  | "logs.read";

db.query.Server.findMany().then((servers) => {
  for (const server of servers) {
    if (server.containerId) {
      docker.inspectContainer(server.containerId).then(async (result) => {
        if (result.status === "success" && result.data?.status === "running") {
          console.info("Restarting watcher for", server.name);

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

const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'tRPC OpenAPI',
  version: '1.0.0',
  baseUrl: 'http://localhost:3000/api',
});
writeFileSync("./openapi.json", JSON.stringify(openApiDocument))

const app = express();
app.use(cors())
app.use('/trpc', createExpressMiddleware({ router: appRouter, createContext }));
app.use('/api', createOpenApiExpressMiddleware({ router: appRouter, createContext }));

if (process.env.HTTPS === "true") {
  const server = https.createServer(
    {
      key: readFileSync("private-key.pem"),
      cert: readFileSync("certificate.pem"),
    },
    app
  );
  console.info("HTTPS Enabled");
  server.listen(3000);
} else {
  const server = http.createServer(
    {},
    app
  );
  server.listen(3000);
}
