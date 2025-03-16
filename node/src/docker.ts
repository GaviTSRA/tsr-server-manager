import axios, { AxiosResponse } from "axios";
import tar from "tar-stream";
import stream, { EventEmitter } from "stream";
import fs from "fs";

export function createAsyncIterable(emitter: EventEmitter) {
  return {
    [Symbol.asyncIterator]() {
      const queue: any[] = [];
      let resolve: ((value: any) => void) | null = null;

      emitter.on("data", (data) => {
        if (resolve) {
          resolve({ value: data });
          resolve = null;
        } else {
          queue.push(data);
        }
      });
      return {
        next() {
          return new Promise((res) => {
            if (queue.length > 0) {
              res({ value: queue.shift() });
            } else {
              resolve = res;
            }
          });
        },
      };
    },
  };
}

const dockerSocketPath = "/var/run/docker.sock";
let dockerClient = axios.create({});

if (fs.existsSync(dockerSocketPath)) {
  dockerClient = axios.create({
    baseURL: "http://localhost",
    socketPath: dockerSocketPath,
  });
} else if (process.env.DOCKER_HOST) {
  dockerClient = axios.create({
    baseURL: process.env.DOCKER_HOST.replace("tcp://", "http://"),
  });
} else {
  dockerClient = axios.create({
    baseURL: "http://localhost:2375",
  });
  console.info(
    "Could not detect Docker API endpoint. Make sure DOCKER_HOST is set or Docker socket is accessible. Using fallback localhost"
  );
}

type BasicReponse = "success" | "server error" | "unknown error";

type CreateContainerResponse =
  | BasicReponse
  | "bad paramater"
  | "no such image"
  | "conflict";
type InspectContainerResponse = BasicReponse | "no such container";
type StartContainerResponse =
  | BasicReponse
  | "container already started"
  | "no such container";
type RestartContainerResponse = BasicReponse | "no such container";
type StopContainerResponse =
  | BasicReponse
  | "container already stopped"
  | "no such container";
type KillContainerResponse =
  | BasicReponse
  | "no such container"
  | "container is not running";
type GetImagesResponse = BasicReponse;
type ContainerStatus = {
  id: string;
  status:
    | "created"
    | "running"
    | "paused"
    | "restarting"
    | "removing"
    | "exited"
    | "dead";
  cpuUsage: number;
  usedRam: number;
  availableRam: number;
};

async function request(
  url: string,
  method: "get" | "post" | "delete",
  params: any,
  body: any,
  stream: boolean = false
): Promise<AxiosResponse<any, any>> {
  const res = await dockerClient
    .request({
      url: "/v1.45" + url,
      method,
      params,
      data: body,
      responseType: stream ? "stream" : undefined,
    })
    .catch((error) => {
      if (error.response) {
        return error.response;
      }
    });

  return res;
}

async function createTarArchive(content: string): Promise<Buffer> {
  const pack = tar.pack();
  const chunks: Buffer[] = [];

  pack.entry({ name: "Dockerfile" }, content, (err) => {
    if (err) throw err;
    pack.finalize();
  });

  for await (const chunk of pack) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

export async function createContainer(
  id: string,
  name: string,
  image: string,
  cmd: string[],
  env: string[],
  ports: string[],
  cpuLimit: number,
  ramLimit: number,
  restartPolicy: "no" | "on-failure" | "unless-stopped" | "always",
  restartRetryCount: number
): Promise<{ status: CreateContainerResponse; containerId?: string }> {
  const hostDirectory = (process.env.SERVERS_DIR as string) + id;
  const serverDirectory = "servers/" + id;
  if (!fs.existsSync(serverDirectory)) fs.mkdirSync(serverDirectory);
  const exposedPorts: { [port: string]: {} } = {};
  const portBindings: { [port: string]: { HostPort: string }[] } = {};
  ports.forEach((port) => (exposedPorts[`${port}/tcp`] = {}));
  ports.forEach((port) => (exposedPorts[`${port}/udp`] = {}));
  ports.forEach((port) => (portBindings[`${port}/tcp`] = [{ HostPort: port }]));
  ports.forEach((port) => (portBindings[`${port}/udp`] = [{ HostPort: port }]));
  const result = await request(
    "/containers/create",
    "post",
    { name },
    {
      Image: image,
      Tty: true,
      HostConfig: {
        Binds: [`${hostDirectory}:/server`],
        PortBindings: portBindings,
        Memory: ramLimit * 1024 * 1024,
        CpuPeriod: 100000,
        CpuQuota: 100000 * cpuLimit,
        RestartPolicy: {
          Name: restartPolicy,
          MaximumRetryCount:
            restartPolicy === "on-failure" ? restartRetryCount : undefined,
        },
      },
      WorkingDir: "/server",
      Env: env,
      Cmd: cmd,
      ExposedPorts: exposedPorts,
    }
  );
  switch (result.status) {
    case 201:
      return { status: "success", containerId: result.data["Id"] };
    case 400:
      return { status: "bad paramater" };
    case 404:
      return { status: "no such image" };
    case 409:
      return { status: "conflict" };
    case 500:
      console.info(result.data);
      return { status: "server error" };
  }
  console.info(
    "unknown error (create): " + result.status + "\n" + result.statusText
  );
  return { status: "unknown error" };
}

export async function inspectContainer(
  id: string
): Promise<{ status: InspectContainerResponse; data?: ContainerStatus }> {
  const result = await request(`/containers/${id}/json`, "get", {}, {});
  const stats = await request(
    `/containers/${id}/stats`,
    "get",
    { stream: false },
    {}
  );
  let usedRam = 0;
  let availableRam = 0;
  let cpu_delta = 0;
  let system_cpu_delta = 0;
  try {
    availableRam = stats.data["memory_stats"]["limit"];
    usedRam =
      stats.data["memory_stats"]["usage"] -
      (stats.data["memory_stats"]["stats"]["cache"] ?? 0);
    cpu_delta =
      stats.data["cpu_stats"]["cpu_usage"]["total_usage"] -
      stats.data["precpu_stats"]["cpu_usage"]["total_usage"];
    system_cpu_delta =
      stats.data["cpu_stats"]["system_cpu_usage"] -
      stats.data["precpu_stats"]["system_cpu_usage"];
  } catch {
    availableRam = 0;
    usedRam = 0;
    cpu_delta = 0;
    system_cpu_delta = 0.001;
  }

  switch (result.status) {
    case 200:
      return {
        status: "success",
        data: {
          id: result.data["Id"],
          status: result.data["State"]["Status"],
          cpuUsage:
            (cpu_delta / system_cpu_delta) *
            stats.data["cpu_stats"]["online_cpus"] *
            100.0,
          usedRam,
          availableRam,
        },
      };
    case 404:
      return { status: "no such container" };
    case 500:
      return { status: "server error" };
  }
  console.info(
    "unknown error (inspect): " + result.status + "\n" + result.statusText
  );
  return { status: "unknown error" };
}

export async function* containerStats(id: string) {
  const res = await request(
    `/containers/${id}/stats`,
    "get",
    {
      stream: true,
    },
    {},
    true
  );
  for await (const rawStats of createAsyncIterable(res.data)) {
    let ramUsage = 0;
    let ramAvailable = 0;
    let cpu_delta = 0;
    let system_cpu_delta = 0;
    let cpuUsage = 0;
    try {
      const stats = JSON.parse(rawStats);
      ramAvailable = stats["memory_stats"]["limit"];
      ramUsage =
        stats["memory_stats"]["usage"] -
        (stats["memory_stats"]["stats"]["cache"] ?? 0);
      cpu_delta =
        stats["cpu_stats"]["cpu_usage"]["total_usage"] -
        stats["precpu_stats"]["cpu_usage"]["total_usage"];
      system_cpu_delta =
        stats["cpu_stats"]["system_cpu_usage"] -
        stats["precpu_stats"]["system_cpu_usage"];
      cpuUsage =
        (cpu_delta / system_cpu_delta) *
        stats["cpu_stats"]["online_cpus"] *
        100;
    } catch {
      continue;
    }
    yield {
      cpuUsage,
      ramUsage,
      ramAvailable,
    };
  }
}

export async function startContainer(
  id: string
): Promise<StartContainerResponse> {
  const result = await request(`/containers/${id}/start`, "post", {}, {});
  switch (result.status) {
    case 204:
      return "success";
    case 304:
      return "container already started";
    case 404:
      return "no such container";
    case 500:
      return "server error";
  }
  console.info(
    "unknown error (start): " + result.status + "\n" + result.statusText
  );
  return "unknown error";
}

export async function restartContainer(
  id: string
): Promise<RestartContainerResponse> {
  const result = await request(`/containers/${id}/restart`, "post", {}, {});
  switch (result.status) {
    case 204:
      return "success";
    case 404:
      return "no such container";
    case 500:
      return "server error";
  }
  console.info(
    "unknown error (restart): " + result.status + "\n" + result.statusText
  );
  return "unknown error";
}

export async function stopContainer(
  id: string
): Promise<StopContainerResponse> {
  const result = await request(`/containers/${id}/stop`, "post", {}, {});
  switch (result.status) {
    case 204:
      return "success";
    case 304:
      return "container already stopped";
    case 404:
      return "no such container";
    case 500:
      return "server error";
  }
  console.info(
    "unknown error (stop): " + result.status + "\n" + result.statusText
  );
  return "unknown error";
}

export async function killContainer(
  id: string
): Promise<KillContainerResponse> {
  const result = await request(`/containers/${id}/kill`, "post", {}, {});
  switch (result.status) {
    case 204:
      return "success";
    case 404:
      return "no such container";
    case 409:
      return "container is not running";
    case 500:
      return "server error";
  }
  console.info(
    "unknown error (kill): " + result.status + "\n" + result.statusText
  );
  return "unknown error";
}

export async function exec(
  containerId: string,
  command: string[]
): Promise<AxiosResponse<any, any>> {
  const result = await request(
    `/containers/${containerId}/exec`,
    "post",
    {},
    {
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    }
  );
  const execId = result.data.Id;
  return await request(
    `/exec/${execId}/start`,
    "post",
    {},
    {
      Detach: false,
      Tty: true,
    },
    true
  );
}

export async function attachToContainer(
  id: string
): Promise<AxiosResponse<any, any>> {
  return await request(
    `/containers/${id}/attach`,
    "post",
    {
      stream: true,
      logs: true,
      stdout: true,
      stderr: true,
    },
    {},
    true
  );
}

export async function removeContainer(id: string) {
  await request(`/containers/${id}`, "delete", { force: true }, {});
}

export async function downloadImage(image: string) {
  const res = await request(
    "/images/create",
    "post",
    { fromImage: image },
    {},
    true
  );
  await new Promise((resolve, reject) => {
    res.data.on("data", (chunk: any) => {
      console.log(chunk.toString());
    });
    res.data.on("end", resolve);
    res.data.on("error", reject);
  });

  console.info(res.status, res.statusText);
}

export async function buildImage(name: string, dockerfile: string) {
  const tarBuffer = await createTarArchive(dockerfile);
  const tarStream = new stream.PassThrough();
  tarStream.end(tarBuffer);

  const res = await dockerClient.post("/v1.45/build", tarStream, {
    headers: {
      "Content-Type": "application/x-tar",
      "Content-Length": tarBuffer.length,
    },
    params: {
      t: name.toLowerCase().replace(" ", "-"),
    },
    responseType: "stream",
  });

  await new Promise((resolve, reject) => {
    res.data.on("data", (chunk: any) => {
      console.log(chunk.toString());
    });
    res.data.on("end", resolve);
    res.data.on("error", reject);
  });

  console.info(res.status, res.statusText);
}

export async function getImages(): Promise<{
  status: GetImagesResponse;
  data?: string[];
}> {
  const result = await request(`/images/json`, "get", { all: true }, {});
  switch (result.status) {
    case 200:
      const data = [] as string[];
      for (let image of result.data as { RepoTags: string[] }[]) {
        data.push(image.RepoTags[0]);
      }
      return { status: "success", data };
    case 500:
      return { status: "server error" };
  }
  console.info(
    "unknown error (getImg): " + result.status + "\n" + result.statusText
  );
  return { status: "unknown error" };
}
