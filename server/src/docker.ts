import axios, { AxiosResponse } from "axios";
import tar from 'tar-stream';
import stream from 'stream';

type BasicReponse = "success" | "server error" | "unknown error";

type CreateContainerResponse = BasicReponse | "bad paramater" | "no such image" | "conflict";
type InspectContainerResponse = BasicReponse | "no such container";
type StartContainerResponse = BasicReponse | "container already started" | "no such container";
type RestartContainerResponse = BasicReponse | "no such container";
type StopContainerResponse = BasicReponse | "container already stopped" | "no such container";
type KillContainerResponse = BasicReponse | "no such container" | "container is not running";
type ContainerStatus = {
    id: string;
    status: "created" | "running" | "paused" | "restarting" | "removing" | "exited" | "dead";
}

async function request(url: string, method: "get" | "post", params: any, body: any): Promise<AxiosResponse<any, any>> {
    const res = await axios({
        url: "http://localhost:2375/v1.47" + url,
        method,
        params,
        data: body,
    }).catch((error) => {
        if (error.response) {
            return error.response;
        }
    })

    return res;
}

async function createTarArchive(content: string): Promise<Buffer> {
    const pack = tar.pack();
    const chunks: Buffer[] = [];

    pack.entry({ name: 'Dockerfile' }, content, (err) => {
        if (err) throw err;
        pack.finalize();
    });

    for await (const chunk of pack) {
        chunks.push(chunk);
    }

    return Buffer.concat(chunks);
}

export async function createContainer(name: string): Promise<{ status: CreateContainerResponse, containerId?: string }> {
    const result = await request("/containers/create", "post", { name }, { Image: "ubuntu:latest" });
    switch (result.status) {
        case 201:
            return { status: "success", containerId: result.data["Id"] }
        case 400:
            return { status: "bad paramater" }
        case 404:
            return { status: "no such image" }
        case 409:
            return { status: "conflict" }
        case 500:
            return { status: "server error" }
    }
    console.info("unknown error (create): " + result.status + "\n" + result.statusText);
    return { status: "unknown error" }
}

export async function inspectContainer(id: string): Promise<{ status: InspectContainerResponse, data?: ContainerStatus }> {
    const result = await request(`/containers/${id}/json`, "get", {}, {});
    switch (result.status) {
        case 200:
            return {
                status: "success", data: {
                    id: result.data["Id"],
                    status: result.data["State"]["Status"]
                }
            };
        case 404:
            return { status: "no such container" };
        case 500:
            return { status: "server error" };
    }
    console.info("unknown error (inspect): " + result.status + "\n" + result.statusText);
    return { status: "unknown error" };
}

export async function startContainer(id: string): Promise<StartContainerResponse> {
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
    console.info("unknown error (start): " + result.status + "\n" + result.statusText);
    return "unknown error";
}

export async function restartContainer(id: string): Promise<RestartContainerResponse> {
    const result = await request(`/containers/${id}/restart`, "post", {}, {});
    switch (result.status) {
        case 204:
            return "success";
        case 404:
            return "no such container";
        case 500:
            return "server error";
    }
    console.info("unknown error (restart): " + result.status + "\n" + result.statusText);
    return "unknown error";
}

export async function stopContainer(id: string): Promise<StopContainerResponse> {
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
    console.info("unknown error (stop): " + result.status + "\n" + result.statusText);
    return "unknown error";
}

export async function killContainer(id: string): Promise<KillContainerResponse> {
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
    console.info("unknown error (kill): " + result.status + "\n" + result.statusText);
    return "unknown error";
}

export async function createImage(id: string, dockerfile: string) {
    const tarBuffer = await createTarArchive(dockerfile);
    const tarStream = new stream.PassThrough();
    tarStream.end(tarBuffer);

    const res = await axios.post("http://localhost:2375/v1.47/build", tarStream, {
        headers: {
            'Content-Type': 'application/x-tar',
            'Content-Length': tarBuffer.length,
        },
        params: {
            t: `server-${id}`
        }
    });
    console.info(res)
}
