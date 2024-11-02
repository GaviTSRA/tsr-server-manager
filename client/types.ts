export type ServerStatus = {
    id: string;
    containerId: string;
    name: string;
    status: "created" | "running" | "paused" | "restarting" | "removing" | "exited" | "dead";
}