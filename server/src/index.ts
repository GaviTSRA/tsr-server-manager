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
import type { NodeRouter } from "@tsm/node";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  isNonJsonSerializable,
  splitLink,
  TRPCClient,
  unstable_httpSubscriptionLink,
} from "@trpc/client";

export type { AppRouter } from "./trpc/router";
export type { Permission, ServerType } from "@tsm/node";

export const db = drizzle(process.env.DATABASE_URL!, { schema });

type ConnectedNode = {
  id: string;
  name: string;
  trpc: TRPCClient<NodeRouter>;
};

const users = await db.query.User.findMany();

export const nodes: { [id: string]: ConnectedNode } = {};
const registeredNodes = await db.query.Node.findMany();
for (const registeredNode of registeredNodes) {
  // TODO node auth
  const client = createTRPCClient<NodeRouter>({
    links: [
      splitLink({
        // uses the httpSubscriptionLink for subscriptions
        condition: (op) => op.type === "subscription",
        true: unstable_httpSubscriptionLink({
          url: registeredNode.url,
          connectionParams: () => {
            // TODO auth
            // const token = localStorage.getItem("authToken");
            // return { token: token ?? undefined };
            return {};
          },
        }),
        false: splitLink({
          condition: (op) => isNonJsonSerializable(op.input),
          true: httpLink({
            url: registeredNode.url,
            headers: () => {
              return {};
              // TODO auth
              // const token = localStorage.getItem("authToken");
              // return {
              //   Authorization: token ? `Bearer ${token}` : undefined,
              // };
            },
          }),
          false: httpBatchLink({
            url: registeredNode.url,
            headers: () => {
              // TODO auth
              return {};
              // const token = localStorage.getItem("authToken");
              // return {
              //   Authorization: token ? `Bearer ${token}` : undefined,
              // };
            },
          }),
        }),
      }),
    ],
  });

  await client.syncUsers.mutate(users);

  nodes[registeredNode.id] = {
    id: registeredNode.id,
    name: registeredNode.name,
    trpc: client,
  };
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
