export type ServerStatus = {
    id: string;
    containerId?: string;
    name: string;
    type: string;
    options: { [name: string]: string };
    status?: "created" | "running" | "paused" | "restarting" | "removing" | "exited" | "dead";
}

export type ServerType = {
    id: string;
    name: string;
    command: string;
    type: string;
    containerId: string;
    options: {
        [name: string]: {
            name: string;
            type: string;
            default: string;
            options: string[];
        }
    }
};
