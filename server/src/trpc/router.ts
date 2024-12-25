import { z } from "zod";
import { router, publicProcedure, authedProcedure } from "./trpc";
import { v4 } from "uuid";
import fs from "fs";
import { TRPCError } from "@trpc/server";
import { serverRouter } from "./serverRouter";
import * as schema from "../schema";
import * as docker from "../docker";
import { userRouter } from "./userRouter";

type ServerStatus = {
  id: string;
  containerId?: string;
  name: string;
  status?:
    | "created"
    | "running"
    | "paused"
    | "restarting"
    | "removing"
    | "exited"
    | "dead";
};

type ServerType = {
  id: string;
  command: string;
  name: string;
  image: string | null;
  options: {
    [name: string]:
      | {
          type: "string";
          default: string;
        }
      | {
          type: "enum";
          default: string;
          options: string[];
        };
  };
};

const serverTypes: ServerType[] = [];
fs.readdirSync("servertypes").forEach((folder) => {
  const json = fs
    .readFileSync(`servertypes/${folder}/manifest.json`)
    .toString();
  const data = JSON.parse(json);
  serverTypes.push({
    id: folder,
    name: data.name,
    image: data.image,
    command: data.command,
    options: data.options,
  });
});

export const appRouter = router({
  user: userRouter,
  server: serverRouter,
  servers: authedProcedure.query(async ({ ctx }) => {
    const servers = await ctx.db.query.Server.findMany();
    const result = [] as ServerStatus[];
    for (const server of servers) {
      if (server.ownerId !== ctx.user.id) continue;
      if (!server.containerId) {
        result.push({
          id: server.id,
          name: server.name,
        });
        continue;
      }
      const data = await docker.inspectContainer(server.containerId);
      if (!data || !data.data) continue;
      result.push({
        id: server.id,
        containerId: server.containerId,
        name: server.name,
        status: data.data.status,
      });
    }
    return result;
  }),
  serverTypes: publicProcedure.query(async () => {
    return serverTypes;
  }),
  createServer: authedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const type = serverTypes.find((type) => type.id === input.type);
      if (!type) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Unkown server type",
        });
      }
      const id = v4();
      const defaults: { [name: string]: string } = {};
      Object.entries(type.options).map(([key, value]) => {
        if (value.default) {
          defaults[key] = value.default;
        }
      });
      await ctx.db.insert(schema.Server).values({
        id,
        ownerId: ctx.user.id,
        name: input.name,
        state: "NOT_INSTALLED",
        type: type.id,
        options: defaults,
        ports: [],
        cpuLimit: 1,
        ramLimit: 1024,
      });
    }),
});

export type AppRouter = typeof appRouter;
