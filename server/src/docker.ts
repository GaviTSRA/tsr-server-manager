import axios, { AxiosResponse } from "axios";
import tar from "tar-stream";
import stream from "stream";
import { WebSocket } from "ws";
import fs from "fs";
import path from "path";

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
};

async function request(
  url: string,
  method: "get" | "post",
  params: any,
  body: any,
  stream: boolean = false
): Promise<AxiosResponse<any, any>> {
  const res = await axios({
    url: "http://localhost:2375/v1.47" + url,
    method,
    params,
    data: body,
    responseType: stream ? "stream" : undefined,
  }).catch((error) => {
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
  env: string[]
): Promise<{ status: CreateContainerResponse; containerId?: string }> {
  const hostDirectory = path.resolve(__dirname, `../servers/${id}`);
  if (!fs.existsSync(hostDirectory)) fs.mkdirSync(hostDirectory);
  const result = await request(
    "/containers/create",
    "post",
    { name },
    {
      Image: image,
      Tty: true,
      HostConfig: {
        Binds: [`${hostDirectory}:/server`],
      },
      WorkingDir: "/server",
      Env: env,
      Cmd: cmd,
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
  switch (result.status) {
    case 200:
      return {
        status: "success",
        data: {
          id: result.data["Id"],
          status: result.data["State"]["Status"],
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

export function attachToContainer(id: string): WebSocket {
  const ws = new WebSocket(
    `ws://localhost:2375/v1.47/containers/${id}/attach/ws?logs=true&stdout=true&stderr=true`
  );
  return ws;
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
    res.data.on("data", (chunk) => {
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

  const res = await axios.post("http://localhost:2375/v1.47/build", tarStream, {
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
    res.data.on("data", (chunk) => {
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
