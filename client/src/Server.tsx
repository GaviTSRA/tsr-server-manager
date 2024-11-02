import { useState } from "react";
import { PlayCircle, Terminal, File, StopCircle, ArrowUpCircle, AlertCircle, Play, XCircle, RotateCw } from "react-feather";
import { ServerStatus } from "../types";
import { useQuery } from "react-query";
import { useParams } from "react-router-dom";

export function Server() {
    const { serverId } = useParams();
    const [selectedTab, setSelectedTab] = useState("Console");
    const {
        data: server,
        refetch
    } = useQuery({
        queryKey: "server",
        queryFn: () => fetch(`http://localhost:3000/server/${serverId}`).then((res) => res.json()),
        enabled: serverId !== undefined
    });
    console.info(server, serverId)

    const tabs = server ? {
        "Console": [<Terminal />, <Console server={server} />],
        "Files": [<File />, <Files />],
        "Startup": [<PlayCircle />, <Startup />]
    } : {}

    return (
        <div className="w-full h-full flex flex-col bg-background text-primary-text">
            <div className="w-full h-fit bg-header flex flex-row">
                <p className="p-4 my-auto text-2xl mr-4">TSR Server Manager</p>
                {Object.keys(tabs).map((name) => (
                    <div
                        className={"py-1 mt-auto px-4 rounded-t cursor-pointer select-none " + (selectedTab === name ? "bg-background border-t-2 border-accent" : "bg-header")}
                        onClick={() => setSelectedTab(name)}
                        key={name}
                    >
                        <div className="mx-auto flex flex-row gap-2">
                            {tabs[name][0]}
                            <p>{name}</p>
                        </div>
                    </div>
                ))}
            </div>
            {server && (
                <div className="w-full h-full p-4">
                    {tabs[selectedTab][1]}
                </div>
            )}
        </div>
    )
}

function Console({ server }: { server: ServerStatus }) {
    console.info(server, server.containerId)
    let status = undefined;
    switch (server.status) {
        case "created":
        case "exited":
            status = <StopCircle size={30} className="text-red-500" />
            break;
        case "running":
            status = <PlayCircle size={30} className="text-green-500" />
            break;
        case "restarting":
            status = <ArrowUpCircle size={30} className="text-gray-500" />
            break;
        case "dead":
            status = <AlertCircle size={30} className="text-red-500" />
            break;
    }

    return (
        <div className="w-full h-full flex flex-row">
            <div className="bg-black w-2/3 mb-2 h-full rounded"></div>
            <div className="mx-4 w-1/3">
                <div className="bg-header p-2 rounded w-full flex flex-row items-center gap-2">
                    {status}
                    <p className="text-2xl">{server.name}</p>
                    <div className="flex flex-row my-auto gap-2 p-2 ml-auto rounded bg-border">
                        <PlayCircle size={20} />
                        <RotateCw size={20} />
                        <StopCircle size={20} />
                        <XCircle size={20} />
                    </div>
                </div>
            </div>
        </div>
    )
}

function Files() {
    return <div>
        <p>files</p>
    </div>
}

function Startup() {
    return <div>
        <p>startup</p>
    </div>
}