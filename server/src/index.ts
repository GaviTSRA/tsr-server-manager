import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import * as docker from "./docker";
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";

const db = drizzle(process.env.DATABASE_URL!, { schema });

export interface ServerRouterRequest extends express.Request {
    params: {
        serverId: string;
    },
    body: {
        server: schema.ServerType;
    }
}

type ServerStatus = {
    id: string;
    containerId: string;
    name: string;
    status: "created" | "running" | "paused" | "restarting" | "removing" | "exited" | "dead";
}

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.get('/', async (req, res) => {
    const servers = await db.query.Server.findMany();
    const result = [] as ServerStatus[];
    for (const server of servers) {
        const data = await docker.inspectContainer(server.containerId);
        if (!data || !data.data) continue;
        result.push({
            id: server.id,
            containerId: server.containerId,
            name: server.name,
            status: data.data.status
        });
    }
    res.send(result)
})

app.post("/servers/create", async (req, res) => {
    if (!req.body.name) {
        res.sendStatus(400)
    }
    // const result = await docker.createContainer(req.body.name.replace(" ", "-"));
    // if (result.status !== "success" || !result.containerId) {
    //     res.status(500);
    //     res.send(result.status);
    // }
    // await db.insert(schema.Server).values({
    //     name: req.body.name,
    //     containerId: result.containerId as string
    // });
    docker.createImage("abc", "FROM ubuntu:latest\nCMD \"java -jar\"")
    res.sendStatus(201);
})

const serverRouter = express.Router({ mergeParams: true })
serverRouter.use(async (req: ServerRouterRequest, res, next) => {
    try {
        const result = await db.query.Server.findFirst({
            where: (server, { eq }) => eq(server.id, req.params.serverId)
        });
        if (result) {
            req.body.server = result;
            next();
        } else {
            res.sendStatus(500);
        }
    } catch {
        res.sendStatus(500)
    }
})
app.use("/server/:serverId", serverRouter);

serverRouter.get("/", async (req: ServerRouterRequest, res) => {
    const result = await docker.inspectContainer(req.body.server.containerId);
    res.status(result.status === "success" ? 200 : 500);
    res.send({
        id: req.body.server.id,
        containerId: req.body.server.containerId,
        name: req.body.server.name,
        status: result.data?.status
    })
})

serverRouter.post("/start", async (req: ServerRouterRequest, res) => {
    const result = await docker.startContainer(req.body.server.containerId);
    res.status(result === "success" ? 200 : 500);
    res.send(result);
})

serverRouter.post("/restart", async (req: ServerRouterRequest, res) => {
    const result = await docker.restartContainer(req.body.server.containerId);
    res.status(result === "success" ? 200 : 500);
    res.send(result);
})

serverRouter.post("/stop", async (req: ServerRouterRequest, res) => {
    const result = await docker.stopContainer(req.body.server.containerId);
    res.status(result === "success" ? 200 : 500);
    res.send(result);
})

serverRouter.post("/kill", async (req: ServerRouterRequest, res) => {
    const result = await docker.killContainer(req.body.server.containerId);
    res.status(result === "success" ? 200 : 500);
    res.send(result);
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
})