import { eq } from "drizzle-orm";
import {
  createTRPCClient,
  httpBatchLink,
  httpLink,
  isNonJsonSerializable,
  splitLink,
  TRPCClient,
  TRPCClientError,
  unstable_httpSubscriptionLink,
} from "@trpc/client";
import type { NodeRouter } from "@tsm/node";
import { NodeType } from "./schema";
import { db, nodes } from ".";
import * as schema from "./schema";
import { TRPCError } from "@trpc/server";
import SuperJSON from "superjson";
import { ClientError, ClientMiddlewareCall, createChannel, createClientFactory, Metadata, RawClient } from "nice-grpc";
import { NodeDefinition } from "./generated/node";
import { FromTsProtoServiceDefinition } from "nice-grpc/lib/service-definitions/ts-proto";

export type ConnectedNode = {
  id: string;
  name: string;
  token: string | undefined;
  grpc_token: string | undefined;
  usersSynced: boolean;
  trpc: TRPCClient<NodeRouter>;
  grpc: RawClient<FromTsProtoServiceDefinition<NodeDefinition>>;
};

function getNodeClient(id: string, url: string) {
  return createTRPCClient<NodeRouter>({
    links: [
      splitLink({
        condition: (op) => op.type === "subscription",
        true: unstable_httpSubscriptionLink({
          transformer: SuperJSON,

          url,
          connectionParams: async () => {
            const token = nodes[id] ? nodes[id].token : undefined;
            return { token };
          },
        }),
        false: splitLink({
          condition: (op) => isNonJsonSerializable(op.input),
          true: httpLink({
            transformer: SuperJSON,

            url,
            headers: () => {
              const token = nodes[id] ? nodes[id].token : undefined;
              return {
                Authorization: `Bearer ${token}`,
              };
            },
          }),
          false: httpBatchLink({
            transformer: SuperJSON,
            url,
            headers: () => {
              const token = nodes[id] ? nodes[id].token : undefined;
              return {
                Authorization: `Bearer ${token}`,
              };
            },
          }),
        }),
      }),
    ],
  });
}

function createAuthMiddleware(getToken: () => string | undefined) {
  return async function* authMiddleware<Request, Response>(
    call: ClientMiddlewareCall<Request, Response>,
    options: any,
  ) {
    const token = getToken();
    const metadata = Metadata(options.metadata ?? {});
    if (token) {
      metadata.set("authorization", token);
    }
    return yield* call.next(call.request, { ...options, metadata });
  };
}

function getGrpcClient(url: string, getToken: () => string | undefined): RawClient<FromTsProtoServiceDefinition<NodeDefinition>> {
  const channel = createChannel("host.docker.internal:8772");
  const client = createClientFactory().use(createAuthMiddleware(getToken)).create(NodeDefinition, channel);
  return client;
}

export async function registerNode(node: NodeType) {
  console.info(`[${node.name}] Registering...`);

  nodes[node.id] = {
    id: node.id,
    name: node.name,
    token: undefined,
    grpc_token: undefined,
    usersSynced: false,
    trpc: getNodeClient(node.id, node.url),
    grpc: getGrpcClient(node.url, () => nodes[node.id].grpc_token)
  };

  checkNode(node);
}

async function checkNode(node: NodeType) {
  console.info(`[${node.name}] Checking...`);
  if (nodes[node.id].token === undefined) {
    console.info(`[${node.name}] Getting token...`);
    try {
      const dbNode = await db.query.Node.findFirst({
        where: (Node, { eq }) => eq(Node.id, node.id),
        columns: { password: true },
      });
      const token = await nodes[node.id].trpc.authenticate.mutate({
        password: dbNode?.password ?? node.password,
      });
      nodes[node.id].token = token;
    } catch (error) {
      handleNodeError(node, error);
      return;
    }
  }

  if (nodes[node.id].grpc_token === undefined) {
    console.info(`[${node.name}] Getting grpc token...`);
    try {
      const dbNode = await db.query.Node.findFirst({
        where: (Node, { eq }) => eq(Node.id, node.id),
        columns: { password: true },
      });
      const token = await nodes[node.id].grpc.authenticate({
        password: dbNode?.password ?? node.password
      });
      nodes[node.id].grpc_token = token.token;
    } catch (error) {
      handleNodeError(node, error);
      return;
    }
  }

  if (!nodes[node.id].usersSynced) {
    console.info(`[${node.name}] Syncing users...`);
    try {
    const users = await db.query.User.findMany();
      await nodes[node.id].trpc.syncUsers.mutate(users);
      nodes[node.id].usersSynced = true;
    } catch (err) {
      await db
        .update(schema.Node)
        .set({ state: "SYNC_ERROR" })
        .where(eq(schema.Node.id, node.id));
      console.info(err);
      return;
    }
  }

  try {
    console.info(`[${node.name}] Pinging...`);
    await nodes[node.id].trpc.ping.query();
    await nodes[node.id].grpc.ping({});
    await db
      .update(schema.Node)
      .set({ state: "CONNECTED" })
      .where(eq(schema.Node.id, node.id));
    console.info(`[${node.name}] Connected!`);
  } catch (error) {
    handleNodeError(node, error);
    return;
  }

  setTimeout(async () => {
    checkNode(node);
  }, 5000);
}

export async function handleNodeError(dbNode: NodeType, error: any) {
  const node = nodes[dbNode.id];
  console.info(`[${node.name}] ERR: ${error}`);
  let errorHandled = false;

  if ((error instanceof TRPCClientError && error.message === "fetch failed") 
    || (error instanceof ClientError && error.message.includes("No connection established"))) {
    errorHandled = true;
    await db
      .update(schema.Node)
      .set({ state: "CONNECTION_ERROR" })
      .where(eq(schema.Node.id, node.id))
      .returning();
    const data = await db.query.Node.findFirst({
      where: (Node, { eq }) => eq(Node.id, node.id),
      columns: { url: true },
    });
    nodes[node.id] = {
      id: node.id,
      name: node.name,
      token: error instanceof TRPCClientError ? undefined : node.token,
      grpc_token: error instanceof ClientError ? undefined: node.grpc_token,
      usersSynced: false,
      trpc: getNodeClient(node.id, data?.url ?? ""),
      grpc: getGrpcClient(data?.url ?? "", () => nodes[node.id].grpc_token)
    };
  } else if ((error instanceof TRPCClientError || error instanceof ClientError) && error.message.includes("NODE_UNAUTHORIZED")) {
    errorHandled = true;
    await db
      .update(schema.Node)
      .set({ state: "AUTHENTICATION_ERROR" })
      .where(eq(schema.Node.id, node.id));
    nodes[node.id].token = error instanceof TRPCClientError ? undefined : nodes[node.id].token;
    nodes[node.id].grpc_token = error instanceof ClientError ? undefined: nodes[node.id].grpc_token
    nodes[node.id].usersSynced = false;
  }

  setTimeout(async () => {
    checkNode(dbNode);
  }, 5000);

  if (!errorHandled) {
    return error;
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to communicate with node",
    cause: error,
  });
}
