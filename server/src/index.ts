import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import cors from "cors";
import * as docker from "./docker";
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { v4 } from "uuid";
import { PassThrough } from "stream";
import axios from "axios";
import { eq } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!, { schema });

export interface ServerRouterRequest extends express.Request {
  params: {
    serverId: string;
  };
  body: {
    server: schema.ServerType;
    options?: { [name: string]: string };
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
  const servers = await db.query.Server.findMany();
  const result = [] as ServerStatus[];
  for (const server of servers) {
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
  res.send(result);
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
        type.image ?? type.options["image"].default,
        ["/bin/sh", "-c", type.command],
        env
      );
      if (result.status !== "success" || !result.containerId) {
        res.status(500);
        res.send(result.status);
        return;
      }
      await db
        .update(schema.Server)
        .set({ containerId: result.containerId })
        .where(eq(schema.Server.id, req.body.server.id));
      containerId = result.containerId;
    }

    res.write("[TSR Server Manager] Installing server...\n");
    res.write("[TSR Server Manager] Creating install script...\n");
    fs.copyFileSync(
      `servertypes/${type.id}/install.sh`,
      `servers/${id}/install.sh`
    );

    res.write(`[TSR Server Manager] Starting container ${containerId}...\n`);
    const startRes = await docker.startContainer(containerId);
    res.write(startRes + "\n");

    res.write("[TSR Server Manager] Running install script...\n");
    const res2 = await docker.exec(containerId, ["sh", "/server/install.sh"]);

    const writable = res.write.bind(res);
    res2.data.on("data", (chunk: any) => {
      writable(chunk);
    });

    res2.data.on("end", async () => {
      res.write("[TSR Server Manager] Server installed\n");
      await docker.stopContainer(containerId);
      await db
        .update(schema.Server)
        .set({ state: "INSTALLED" })
        .where(eq(schema.Server.id, id));
    });
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
    .set({ options: req.body.options })
    .where(eq(schema.Server.id, req.body.server.id));
  res.sendStatus(200);
});

serverRouter.get("/connect", async (req, res) => {
  const stream = new PassThrough();
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const dockerUrl = `http://localhost:2375/containers/${req.body.server.containerId}/attach?stream=true&stdout=true&stderr=true`;

  try {
    const logsResponse = await axios.get(
      `http://localhost:2375/containers/${req.body.server.containerId}/logs?stdout=true&stderr=true&logs=true`
    );
    logsResponse.data.split("\n").forEach((log) => {
      stream.write(`data: ${log}\n\n`);
    });

    const wsResponse = await axios({
      method: "get",
      url: dockerUrl,
      responseType: "stream",
      params: {
        stream: true,
        stdout: true,
        stderr: true,
      },
    });

    wsResponse.data.on("data", (chunk) => {
      const logData = chunk.toString();
      stream.write(`data: ${logData}\n\n`);
    });

    wsResponse.data.on("end", () => {
      stream.end();
    });

    wsResponse.data.on("error", (err) => {
      console.error(err);
      stream.end();
    });
  } catch (error) {
    //console.error('Error connecting to Docker API:', error);
    res.status(500).send("Failed to connect to Docker API");
  }

  stream.pipe(res);
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
const requiredImages = [] as string[];
serverTypes.forEach((type) => {
  if (type.image && !requiredImages.includes(type.image))
    requiredImages.push(type.image);
  if (type.options["image"]) {
    type.options["image"].options?.forEach((image) => {
      if (!requiredImages.includes(image)) requiredImages.push(image);
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
