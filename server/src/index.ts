import express, { response } from "express";
import fs from "fs";
import path from "node:path";
import bodyParser from "body-parser";
import cors from "cors";
import * as docker from "./docker";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { v4 } from "uuid";
import { PassThrough } from "stream";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!, { schema });

export interface ServerRouterRequest extends express.Request {
  params: {
    serverId: string;
  };
  query: {
    path?: string;
  };
  body: {
    server: schema.ServerType;
    options?: { [name: string]: string };
    ports?: string[];
    command?: string;
    name?: string;
    type?: "file" | "folder";
    content?: string;
    limits: {
      cpu: number;
      ram: number;
    };
  };
}

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
    [name: string]: {
      type: "string" | "enum";
      default: string;
      options: string[] | undefined;
    };
  };
};

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.get("/", async (req, res) => {
  res.setHeader("Content-Type", "text/plain");
  const servers = await db.query.Server.findMany();
  res.write(JSON.stringify({ amount: servers.length }) + "\n");
  const result = [] as ServerStatus[];
  for (const server of servers) {
    if (!server.containerId) {
      res.write(
        JSON.stringify({
          id: server.id,
          name: server.name,
        }) + "\n"
      );
      continue;
    }
    const data = await docker.inspectContainer(server.containerId);
    if (!data || !data.data) continue;
    res.write(
      JSON.stringify({
        id: server.id,
        containerId: server.containerId,
        name: server.name,
        status: data.data.status,
      }) + "\n"
    );
  }
  res.end();
});

app.post("/servers/create", async (req, res) => {
  if (!req.body.name) {
    res.sendStatus(400);
    return;
  }
  if (!req.body.type) {
    res.sendStatus(400);
    return;
  }
  const type = serverTypes.find((type) => type.id === req.body.type);
  if (!type) {
    res.sendStatus(400);
    return;
  }
  const id = v4();
  const defaults = {};
  Object.entries(type.options).map(([key, value]) => {
    if (value.default) {
      defaults[key] = value.default;
    }
  });
  await db.insert(schema.Server).values({
    id,
    name: req.body.name,
    state: "NOT_INSTALLED",
    type: type.id,
    options: defaults,
    ports: [],
    cpuLimit: 1,
    ramLimit: 1024,
  });

  res.sendStatus(201);
});

app.get("/servertypes", async (req, res) => {
  res.send(serverTypes);
});

const serverRouter = express.Router({ mergeParams: true });
serverRouter.use(async (req: ServerRouterRequest, res, next) => {
  try {
    const result = await db.query.Server.findFirst({
      where: (server, { eq }) => eq(server.id, req.params.serverId),
    });
    if (result) {
      req.body.server = result;
      next();
    } else {
      res.sendStatus(500);
    }
  } catch {
    res.sendStatus(500);
  }
});

serverRouter.get("/", async (req: ServerRouterRequest, res) => {
  const result = req.body.server.containerId
    ? await docker.inspectContainer(req.body.server.containerId)
    : undefined;
  res.status(result ? (result.status === "success" ? 200 : 500) : 200);
  res.send({
    id: req.body.server.id,
    containerId: req.body.server.containerId,
    name: req.body.server.name,
    type: req.body.server.type,
    options: req.body.server.options,
    status: result?.data?.status,
    ports: req.body.server.ports,
    cpuUsage: result?.data?.cpuUsage,
    usedRam: result?.data?.usedRam,
    availableRam: result?.data?.availableRam,
    cpuLimit: req.body.server.cpuLimit,
    ramLimit: req.body.server.ramLimit,
  });
});

serverRouter.post("/start", async (req: ServerRouterRequest, res) => {
  if (req.body.server.state === "NOT_INSTALLED") {
    res.setHeader("Content-Type", "text/plain");

    const id = req.body.server.id;
    const type = serverTypes.find(
      (type) => type.id === req.body.server.type
    ) as ServerType;
    let containerId = req.body.server.containerId;
    const env = [] as string[];
    Object.entries(req.body.server.options).map(([id, value]) => {
      env.push(`${id.toUpperCase()}=${value}`);
    });

    if (!containerId) {
      res.write("[TSR Server Manager] Creating container...\n");
      const result = await docker.createContainer(
        id,
        req.body.server.name.toLowerCase().replace(" ", "-"),
        type.image ?? req.body.server.options["image"],
        [
          "/bin/bash",
          "-c",
          `screen -S server bash -c "/server/install.sh && ${type.command}"`,
        ],
        env,
        req.body.server.ports,
        req.body.server.cpuLimit,
        req.body.server.ramLimit
      );
      if (result.status !== "success" || !result.containerId) {
        res.write(result.status);
        return;
      }
      await db
        .update(schema.Server)
        .set({ containerId: result.containerId })
        .where(eq(schema.Server.id, req.body.server.id));
      containerId = result.containerId;

      res.write("[TSR Server Manager] Installing server...\n");
      res.write("[TSR Server Manager] Creating install script...\n");
      fs.copyFileSync(
        `servertypes/${type.id}/install.sh`,
        `servers/${id}/install.sh`
      );
    }

    res.write(`[TSR Server Manager] Starting container...\n`);
    await docker.startContainer(containerId);
    return;
  }

  if (!req.body.server.containerId) {
    res.sendStatus(500);
    return;
  }
  const result = await docker.startContainer(req.body.server.containerId);
  res.status(result === "success" ? 200 : 500);
  res.send(result);
});

serverRouter.post("/restart", async (req: ServerRouterRequest, res) => {
  if (!req.body.server.containerId) {
    res.sendStatus(500);
    return;
  }
  const result = await docker.restartContainer(req.body.server.containerId);
  res.status(result === "success" ? 200 : 500);
  res.send(result);
});

serverRouter.post("/stop", async (req: ServerRouterRequest, res) => {
  if (!req.body.server.containerId) {
    res.sendStatus(500);
    return;
  }
  docker.exec(req.body.server.containerId, [
    "screen",
    "-S",
    "server",
    "-X",
    "stuff",
    "stop^M",
  ]);
  const result = await docker.stopContainer(req.body.server.containerId);
  res.status(result === "success" ? 200 : 500);
  res.send(result);
});

serverRouter.post("/kill", async (req: ServerRouterRequest, res) => {
  if (!req.body.server.containerId) {
    res.sendStatus(500);
    return;
  }
  const result = await docker.killContainer(req.body.server.containerId);
  res.status(result === "success" ? 200 : 500);
  res.send(result);
});

serverRouter.post("/options", async (req: ServerRouterRequest, res) => {
  if (!req.body.options) {
    res.sendStatus(400);
    return;
  }
  await db
    .update(schema.Server)
    .set({ options: req.body.options, containerId: null })
    .where(eq(schema.Server.id, req.body.server.id));
  if (req.body.server.containerId) {
    await docker.removeContainer(req.body.server.containerId);
  }
  res.sendStatus(200);
});

serverRouter.post("/ports", async (req: ServerRouterRequest, res) => {
  if (!req.body.ports) {
    res.sendStatus(400);
    return;
  }
  await db
    .update(schema.Server)
    .set({ ports: req.body.ports, containerId: null })
    .where(eq(schema.Server.id, req.body.server.id));
  if (req.body.server.containerId) {
    await docker.removeContainer(req.body.server.containerId);
  }
  res.sendStatus(200);
});

serverRouter.post("/limits", async (req: ServerRouterRequest, res) => {
  if (!req.body.limits) {
    res.sendStatus(400);
    return;
  }
  await db
    .update(schema.Server)
    .set({
      cpuLimit: req.body.limits.cpu,
      ramLimit: req.body.limits.ram,
      containerId: null,
    })
    .where(eq(schema.Server.id, req.body.server.id));
  if (req.body.server.containerId) {
    await docker.removeContainer(req.body.server.containerId);
  }
  res.sendStatus(200);
});

serverRouter.post("/run", async (req: ServerRouterRequest, res) => {
  if (!req.body.command) {
    res.sendStatus(400);
    return;
  }
  if (!req.body.server.containerId) {
    res.sendStatus(404);
    return;
  }
  await docker.exec(req.body.server.containerId, [
    "screen",
    "-S",
    "server",
    "-X",
    "stuff",
    req.body.command + "^M",
  ]);
  res.sendStatus(200);
});

serverRouter.get("/connect", async (req: ServerRouterRequest, res) => {
  if (!req.body.server.containerId) {
    res.sendStatus(500);
    return;
  }
  const stream = new PassThrough();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const res2 = await docker.attachToContainer(req.body.server.containerId);
    res2.data.on("data", (chunk) => {
      stream.write(chunk.toString());
    });
    }
  } catch (error) {
    console.error("Error connecting to Docker API:", error);
    res.status(500).send("Failed to connect to Docker API");
  }

  stream.pipe(res);
});

serverRouter.get("/files", async (req: ServerRouterRequest, res) => {
  if (!req.query.path || req.query.path.includes("..")) {
    res.sendStatus(400);
    return;
  }
  const root = "servers/" + req.params.serverId;
  const target = path.normalize(path.join(root, req.query.path));
  try {
    const stats = fs.statSync(target);
    if (!stats.isDirectory()) {
      const content = fs.readFileSync(target).toString();
      res.json({ type: "file", content });
      return;
    }
  } catch (err) {
    console.info(err);
    res.sendStatus(404);
    return;
  }

  const result: {
    name: string;
    type: "file" | "folder";
    lastEdited: Date;
    size: number;
  }[] = [];
  fs.readdirSync(target).map((filename) => {
    const file = path.join(target, filename);
    const stats = fs.lstatSync(file);
    result.push({
      name: filename,
      type: stats.isDirectory() ? "folder" : "file",
      lastEdited: stats.mtime,
      size: stats.size,
    });
  });
  res.json({ type: "folder", files: result });
});

serverRouter.post("/files/rename", async (req: ServerRouterRequest, res) => {
  if (!req.query.path || req.query.path.includes("..") || !req.body.name) {
    res.sendStatus(400);
    return;
  }
  const root = "servers/" + req.params.serverId;
  const target = path.normalize(path.join(root, req.query.path));
  const dir = path.dirname(target);
  const updatedPath = path.join(dir, req.body.name);
  fs.renameSync(target, updatedPath);
  res.sendStatus(200);
});

serverRouter.post("/files/edit", async (req: ServerRouterRequest, res) => {
  if (!req.query.path || req.query.path.includes("..") || !req.body.content) {
    res.sendStatus(400);
    return;
  }
  const root = "servers/" + req.params.serverId;
  const target = path.normalize(path.join(root, req.query.path));
  fs.writeFileSync(target, req.body.content);
  res.sendStatus(200);
});

serverRouter.delete("/files", async (req: ServerRouterRequest, res) => {
  if (!req.query.path || req.query.path.includes("..")) {
    res.sendStatus(400);
    return;
  }
  const root = "servers/" + req.params.serverId;
  const target = path.normalize(path.join(root, req.query.path));
  fs.rmSync(target);
  res.sendStatus(200);
});

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

app.use("/server/:serverId", serverRouter);
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
