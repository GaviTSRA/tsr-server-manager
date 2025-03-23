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

export type ConnectedNode = {
  id: string;
  name: string;
  token: string | undefined;
  usersSynced: boolean;
  trpc: TRPCClient<NodeRouter>;
};

export async function registerNode(node: NodeType) {
  const users = await db.query.User.findMany();

  const client = createTRPCClient<NodeRouter>({
    links: [
      splitLink({
        condition: (op) => op.type === "subscription",
        true: unstable_httpSubscriptionLink({
          url: node.url,
          connectionParams: async () => {
            const token = nodes[node.id] ? nodes[node.id].token : undefined;
            return { token };
          },
        }),
        false: splitLink({
          condition: (op) => isNonJsonSerializable(op.input),
          true: httpLink({
            url: node.url,
            headers: () => {
              const token = nodes[node.id] ? nodes[node.id].token : undefined;
              return {
                Authorization: `Bearer ${token}`,
              };
            },
          }),
          false: httpBatchLink({
            url: node.url,
            headers: () => {
              const token = nodes[node.id] ? nodes[node.id].token : undefined;
              return {
                Authorization: `Bearer ${token}`,
              };
            },
          }),
        }),
      }),
    ],
  });

  nodes[node.id] = {
    id: node.id,
    name: node.name,
    token: undefined,
    usersSynced: false,
    trpc: client,
  };

  setInterval(async () => {
    if (nodes[node.id].token === undefined) {
      try {
        const dbNode = await db.query.Node.findFirst({
          where: (Node, { eq }) => eq(Node.id, node.id),
          columns: { password: true },
        });
        const token = await client.authenticate.mutate({
          password: dbNode?.password ?? node.password,
        });
        nodes[node.id].token = token;
      } catch (error) {
        handleNodeError(nodes[node.id], error);
        return;
      }
    }

    if (!nodes[node.id].usersSynced) {
      try {
        await client.syncUsers.mutate(users);
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
      await client.ping.query();
      await db
        .update(schema.Node)
        .set({ state: "CONNECTED" })
        .where(eq(schema.Node.id, node.id));
    } catch (error) {
      handleNodeError(nodes[node.id], error);
    }
  }, 5000);
}

export async function handleNodeError(node: ConnectedNode, error: any) {
  let errorHandled = false;

  if (error instanceof TRPCClientError) {
    switch (error.message) {
      case "fetch failed":
        errorHandled = true;
        await db
          .update(schema.Node)
          .set({ state: "CONNECTION_ERROR" })
          .where(eq(schema.Node.id, node.id));
        break;
      case "NODE_UNAUTHORIZED":
        errorHandled = true;
        await db
          .update(schema.Node)
          .set({ state: "AUTHENTICATION_ERROR" })
          .where(eq(schema.Node.id, node.id));
        nodes[node.id] = {
          id: node.id,
          name: node.name,
          token: undefined,
          usersSynced: false,
          trpc: node.trpc,
        };
        break;
    }
  }

  if (!errorHandled) {
    return error;
  }
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Failed to communicate with node",
    cause: error,
  });
}
