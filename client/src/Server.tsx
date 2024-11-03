import { useEffect, useState } from "react";
import { PlayCircle, Terminal, File, StopCircle, ArrowUpCircle, AlertCircle, Play, XCircle, RotateCw } from "react-feather";
import { ServerStatus, ServerType } from "../types";
import { useMutation, useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { Dropdown } from "./components/Dropdown";

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

    const tabs = server ? {
        "Console": [<Terminal />, <Console server={server} refetch={refetch} />],
        "Files": [<File />, <Files />],
        "Startup": [<PlayCircle />, <Startup server={server} refetch={refetch} />]
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
                <div className="w-full h-full overflow-y-auto p-4">
                    {tabs[selectedTab][1]}
                </div>
            )}
        </div>
    )
}

function Console({ server, refetch }: { server: ServerStatus, refetch: () => void }) {
    const [startButtonEnabled, setStartButtonEnabled] = useState(false);
    const [restartButtonEnabled, setRestartButtonEnabled] = useState(false);
    const [stopButtonEnabled, setStopButtonEnabled] = useState(false);
    const [killButtonEnabled, setKillButtonEnabled] = useState(false);
    const [statusIcon, setStatusIcon] = useState(null);
    const [logs, setLogs] = useState([] as string[]);

    const startServer = useMutation(async () => {
        const response = await fetch(`http://localhost:3000/server/${server.id}/start`, { method: "POST" });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            if (chunk === "success") break;
            setLogs(prev => [...prev, ...chunk.split("\n").filter(el => el !== "")]);
        }
    })
    const restartServer = useMutation({
        mutationFn: () => {
            return fetch(`http://localhost:3000/server/${server.id}/restart`, { method: "POST" })
        },
    })
    const stopServer = useMutation({
        mutationFn: () => {
            return fetch(`http://localhost:3000/server/${server.id}/stop`, { method: "POST" })
        },
    })
    const killServer = useMutation({
        mutationFn: () => {
            return fetch(`http://localhost:3000/server/${server.id}/kill`, { method: "POST" })
        },
    })

    const fetchLogs = async () => {
        const response = await fetch(`http://localhost:3000/server/${server.id}/connect`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.body.getReader();
    };

    const { data: logStream, error } = useQuery(['serverLogs', server.id], fetchLogs);

    useEffect(() => {
        if (logStream) {
            const decoder = new TextDecoder('utf-8');

            const readStream = async () => {
                while (true) {
                    const { done, value } = await logStream.read();
                    if (done) break;

                    const logData = decoder.decode(value, { stream: true });
                    console.log(logData); // Handle the log data (e.g., display it in a UI component)
                }
            };

            readStream();
        }
    }, [logStream]);

    useEffect(() => {
        switch (server.status) {
            case "created":
            case "exited":
            case undefined:
                setStartButtonEnabled(true);
                setRestartButtonEnabled(false);
                setStopButtonEnabled(false);
                setKillButtonEnabled(false);
                setStatusIcon(<StopCircle size={30} className="text-red-500" />)
                break;
            case "running":
                setStartButtonEnabled(false);
                setRestartButtonEnabled(true);
                setStopButtonEnabled(true);
                setKillButtonEnabled(true);
                setStatusIcon(<PlayCircle size={30} className="text-green-500" />)
                break;
            case "restarting":
                setStartButtonEnabled(false);
                setRestartButtonEnabled(false);
                setStopButtonEnabled(false);
                setKillButtonEnabled(true);
                setStatusIcon(<ArrowUpCircle size={30} className="text-gray-500" />)
                break;
            case "dead":
                setStartButtonEnabled(true);
                setRestartButtonEnabled(false);
                setStopButtonEnabled(false);
                setKillButtonEnabled(false);
                setStatusIcon(<AlertCircle size={30} className="text-red-500" />)
                break;
        }
    }, [server.status])

    return (
        <div className="w-full h-full flex flex-row">
            <div className="bg-black w-2/3 mb-2 h-full rounded flex flex-col p-4 overflow-auto">
                {logs.map((log) => (
                    <p>{log}</p>
                ))}
            </div>
            <div className="mx-4 w-1/3">
                <div className="bg-header p-2 rounded w-full flex flex-row items-center gap-2">
                    {statusIcon}
                    <p className="text-2xl">{server.name}</p>
                    <div className="flex flex-row my-auto ml-auto">
                        <PlayCircle
                            size={40}
                            className={`p-2 rounded-l border-border border-1 ` + (startButtonEnabled ? "bg-border hover:bg-green-500" : "bg-background")}
                            onClick={() => {
                                if (startButtonEnabled) {
                                    startServer.mutate(undefined, {
                                        onSuccess: () => refetch()
                                    })
                                }
                            }}
                        />
                        <RotateCw
                            size={40}
                            className={`p-2 border-border border-1 ` + (restartButtonEnabled ? "bg-border hover:bg-red-500" : "bg-background")}
                            onClick={() => {
                                if (restartButtonEnabled) {
                                    restartServer.mutate(undefined, {
                                        onSuccess: () => refetch()
                                    })
                                }
                            }}
                        />
                        <StopCircle
                            size={40}
                            className={`p-2 border-border border-1 ` + (stopButtonEnabled ? "bg-border hover:bg-red-500" : "bg-background")}
                            onClick={() => {
                                if (stopButtonEnabled) {
                                    stopServer.mutate(undefined, {
                                        onSuccess: () => refetch()
                                    })
                                }
                            }}
                        />
                        <XCircle
                            size={40}
                            className={`p-2 rounded-r border-border border-1 ` + (killButtonEnabled ? "bg-border hover:bg-red-500" : "bg-background")}
                            onClick={() => {
                                if (killButtonEnabled) {
                                    killServer.mutate(undefined, {
                                        onSuccess: () => refetch()
                                    })
                                }
                            }}
                        />
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

function Startup({ server, refetch }: { server: ServerStatus, refetch: () => void }) {
    const {
        data: serverTypes
    } = useQuery({
        queryKey: "serverTypes",
        queryFn: () => fetch("http://localhost:3000/servertypes").then((res) => res.json()),
    });

    const updateOptions = useMutation({
        mutationFn: (newOptions: { [name: string]: string }) => {
            return fetch(`http://localhost:3000/server/${server.id}/options`, {
                method: "POST",
                headers: {
                    "Content-Type": 'application/json'
                },
                body: JSON.stringify({
                    options: newOptions
                })
            })
        },
    })

    if (!serverTypes) return;
    const type: ServerType = serverTypes.find(type => type.id === server.type)
    if (!type.options) return;

    function setOption(id: string, value: string) {
        const options = server.options;
        options[id] = value;
        updateOptions.mutate(options)
    }

    return (
        <div className="grid grid-cols-2 gap-2">
            {Object.entries(type.options).map(([id, option]) => {
                return (
                    <div className="p-2 rounded bg-header" key={id}>
                        <p className="text-xl mb-1">{option.name}</p>
                        {option.type === "string" && (
                            <input
                                className="w-full bg-border p-2 rounded outline-none"
                                value={server.options[id]}
                                onChange={(value) => { setOption(id, value.target.value) }}
                            />
                        )}
                        {option.type === "enum" && (
                            <Dropdown
                                color="bg-border hover:bg-border-hover"
                                values={option.options}
                                placeholder="Select an option..."
                                onSelect={(value) => { setOption(id, value) }}
                                defaultValue={server.options[id]}
                            />
                        )}
                    </div>
                )
            })}
        </div>
    )
}