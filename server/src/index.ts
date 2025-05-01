import { writeFileSync } from "fs";
import "dotenv/config";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { appRouter } from "./trpc/router";
import { createContext } from "./trpc/trpc";
import http from "http";
import https from "https";
import { readFileSync } from "fs";
import cors from "cors";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import {
  createOpenApiExpressMiddleware,
  generateOpenApiDocument,
} from "trpc-to-openapi";
import { ConnectedNode, registerNode } from "./nodes";
import { EventSource } from "eventsource";
import compression from "compression";

if (typeof global !== "undefined") {
  // @ts-expect-error EventSource polyfill
  global.EventSource = EventSource;
}

export type { AppRouter } from "./trpc/router";
export type { Permission, ServerType } from "@tsm/node";

export const db = drizzle(process.env.DATABASE_URL!, { schema });
export const nodes: { [id: string]: ConnectedNode } = {};

const dbNodes = await db.query.Node.findMany();
for (const node of dbNodes) {
  await registerNode(node);
}

// TODO
// const openApiDocument = generateOpenApiDocument(appRouter, {
//   title: "tRPC OpenAPI",
//   version: "1.0.0",
//   baseUrl: "http://localhost:3000/api",
// });
// writeFileSync("./openapi.json", JSON.stringify(openApiDocument));

const app = express();
app.use(cors());
app.use(compression());
app.use("/trpc", createExpressMiddleware({ router: appRouter, createContext }));
// app.use(
//   "/api",
//   createOpenApiExpressMiddleware({ router: appRouter, createContext })
// );

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
  const server = http.createServer({}, app);
  server.listen(3000);
}
