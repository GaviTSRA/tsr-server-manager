import { useEffect, useRef, useState } from "react";
import {
  PlayCircle,
  Terminal,
  File,
  StopCircle,
  ArrowUpCircle,
  AlertCircle,
  XCircle,
  RotateCw,
  Server as ServerIcon,
  X,
  Cpu,
  Settings,
} from "react-feather";
import { ServerStatus, ServerType } from "../types";
import { useMutation, useQuery } from "react-query";
import { useParams } from "react-router-dom";
import { Dropdown } from "./components/Dropdown";
import AnsiToHtml from "ansi-to-html";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

export function Server() {
  const { serverId } = useParams();
  const [selectedTab, setSelectedTab] = useState("Console");
  const { data: server, refetch } = useQuery({
    queryKey: "server",
    queryFn: () =>
      fetch(`${API_BASE_URL}/server/${serverId}`).then((res) => res.json()),
    enabled: serverId !== undefined,
    refetchInterval: 1000,
  });

  const tabs = server
    ? {
        Console: [<Terminal />, <Console server={server} refetch={refetch} />],
        Files: [<File />, <Files />],
        Network: [
          <ServerIcon />,
          <Network server={server} refetch={refetch} />,
        ],
        Startup: [
          <PlayCircle />,
          <Startup server={server} refetch={refetch} />,
        ],
      }
    : {};

  return (
    <div className="w-full h-full flex flex-col bg-background text-primary-text">
      <div className="w-full h-fit bg-header gap-2 flex flex-row items-end">
        <p className="px-4 pt-4 pb-2 text-2xl mr-4">TSR Server Manager</p>
        {Object.keys(tabs).map((name) => (
          <div
            className={
              "py-1 mt-auto px-4 rounded-t border-border border-t-4 cursor-pointer select-none " +
              (selectedTab === name
                ? "bg-background border-t-accent"
                : "bg-header")
            }
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
  );
}

function Console({
  server,
  refetch,
}: {
  server: ServerStatus;
  refetch: () => void;
}) {
  const ansiConverter = new AnsiToHtml();
  const [startButtonEnabled, setStartButtonEnabled] = useState(false);
  const [restartButtonEnabled, setRestartButtonEnabled] = useState(false);
  const [stopButtonEnabled, setStopButtonEnabled] = useState(false);
  const [killButtonEnabled, setKillButtonEnabled] = useState(false);
  const [statusIcon, setStatusIcon] = useState(null);
  const [logs, setLogs] = useState([] as string[]);
  const consoleRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const startServer = useMutation("start", async () => {
    const response = await fetch(`${API_BASE_URL}/server/${server.id}/start`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      if (chunk === "success") break;
      setLogs((prev) => [
        ...prev,
        ...chunk.split("\n").filter((el) => el !== ""),
      ]);
    }
  });
  const restartServer = useMutation({
    mutationKey: "restart",
    mutationFn: () => {
      return fetch(`${API_BASE_URL}/server/${server.id}/restart`, {
        method: "POST",
      });
    },
  });
  const stopServer = useMutation({
    mutationKey: "stop",
    mutationFn: () => {
      return fetch(`${API_BASE_URL}/server/${server.id}/stop`, {
        method: "POST",
      });
    },
  });
  const killServer = useMutation({
    mutationKey: "kill",
    mutationFn: () => {
      return fetch(`${API_BASE_URL}/server/${server.id}/kill`, {
        method: "POST",
      });
    },
  });

  const fetchLogs = async () => {
    const response = await fetch(`${API_BASE_URL}/server/${server.id}/connect`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.body.getReader();
  };

  const {
    data: logStream,
    refetch: reconnectLogs,
    isRefetching,
  } = useQuery(["serverLogs", server.id], fetchLogs, {
    refetchOnWindowFocus: false,
    refetchInterval: () => false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (server.status === "running" && !isRefetching) {
      setLogs([]);
      reconnectLogs();
    }
  }, [reconnectLogs, server.status]);

  useEffect(() => {
    if (logStream) {
      const decoder = new TextDecoder("utf-8");

      const readStream = async () => {
        while (true) {
          const { done, value } = await logStream.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (chunk === "success") break;
          setLogs((prev) => [
            ...prev,
            ...chunk.split("\n").filter((el) => el !== ""),
          ]);
        }
      };

      readStream();
    }
  }, [logStream]);

  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!consoleRef.current) return;
    const isAtBottom =
      consoleRef.current.scrollHeight - consoleRef.current.scrollTop ===
      consoleRef.current.clientHeight;
    setAutoScroll(isAtBottom);
  };

  useEffect(() => {
    switch (server.status) {
      case undefined:
        setStartButtonEnabled(true);
        setRestartButtonEnabled(false);
        setStopButtonEnabled(false);
        setKillButtonEnabled(false);
        setStatusIcon(<Settings size={40} className="text-gray-500" />);
        break;
      case "created":
      case "exited":
        setStartButtonEnabled(true);
        setRestartButtonEnabled(false);
        setStopButtonEnabled(false);
        setKillButtonEnabled(false);
        setStatusIcon(<StopCircle size={30} className="text-danger" />);
        break;
      case "running":
        setStartButtonEnabled(false);
        setRestartButtonEnabled(true);
        setStopButtonEnabled(true);
        setKillButtonEnabled(true);
        setStatusIcon(<PlayCircle size={30} className="text-success" />);
        break;
      case "restarting":
        setStartButtonEnabled(false);
        setRestartButtonEnabled(false);
        setStopButtonEnabled(false);
        setKillButtonEnabled(true);
        setStatusIcon(<ArrowUpCircle size={30} className="text-gray-500" />);
        break;
      case "dead":
        setStartButtonEnabled(true);
        setRestartButtonEnabled(false);
        setStopButtonEnabled(false);
        setKillButtonEnabled(false);
        setStatusIcon(<AlertCircle size={30} className="text-danger" />);
        break;
    }
  }, [server.status]);

  const [cpuUsage, setCPUUsage] = useState(0);
  const [usedRam, setUsedRam] = useState(0);
  const [availableRam, setAvailableRam] = useState(0);
  useEffect(() => {
    setCPUUsage(Math.round(server.cpuUsage * 100) / 100);
    setUsedRam(Math.round((server.usedRam / 1024 / 1024 / 1024) * 100) / 100);
    setAvailableRam(
      Math.round((server.availableRam / 1024 / 1024 / 1024) * 100) / 100
    );
  }, [server.cpuUsage, server.usedRam, server.availableRam]);

  return (
    <div className="w-full h-full flex flex-row">
      <div
        className="bg-black text-secondary-text w-2/3 mb-2 h-full rounded flex flex-col p-4 overflow-auto "
        ref={consoleRef}
        onScroll={handleScroll}
      >
        {logs.map((log, index) => (
          <div
            key={index}
            dangerouslySetInnerHTML={{
              __html: ansiConverter.toHtml(log),
            }}
          />
        ))}
      </div>
      <div className="mx-4 w-1/3 flex flex-col gap-2">
        <div className="bg-header p-2 rounded w-full flex flex-row items-center gap-2">
          {statusIcon}
          <p className="text-2xl">{server.name}</p>
          <div className="flex flex-row my-auto ml-auto">
            <PlayCircle
              size={40}
              className={
                `p-2 rounded-l border-border border-1 ` +
                (startButtonEnabled
                  ? "bg-border hover:bg-green-800"
                  : "bg-background")
              }
              onClick={() => {
                if (startButtonEnabled) {
                  startServer.mutate(undefined, {
                    onSuccess: () => refetch(),
                  });
                }
              }}
            />
            <RotateCw
              size={40}
              className={
                `p-2 border-border border-1 ` +
                (restartButtonEnabled
                  ? "bg-border hover:bg-danger"
                  : "bg-background")
              }
              onClick={() => {
                if (restartButtonEnabled) {
                  restartServer.mutate(undefined, {
                    onSuccess: () => refetch(),
                  });
                }
              }}
            />
            <StopCircle
              size={40}
              className={
                `p-2 border-border border-1 ` +
                (stopButtonEnabled
                  ? "bg-border hover:bg-danger"
                  : "bg-background")
              }
              onClick={() => {
                if (stopButtonEnabled) {
                  stopServer.mutate(undefined, {
                    onSuccess: () => refetch(),
                  });
                }
              }}
            />
            <XCircle
              size={40}
              className={
                `p-2 rounded-r border-border border-1 ` +
                (killButtonEnabled
                  ? "bg-border hover:bg-danger"
                  : "bg-background")
              }
              onClick={() => {
                if (killButtonEnabled) {
                  killServer.mutate(undefined, {
                    onSuccess: () => refetch(),
                  });
                }
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col bg-header p-2 rounded gap-2">
            <div className="flex flex-row items-center gap-2">
              <Cpu />
              <p>{Number.isNaN(cpuUsage) ? 0 : cpuUsage} %</p>
            </div>
            <div className="flex flex-row items-center gap-2">
              <ServerIcon />
              <p>{Number.isNaN(usedRam) ? 0 : usedRam} GB </p>
              <p className="text-secondary-text">
                / {Number.isNaN(availableRam) ? 0 : availableRam} GB
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Files() {
  return (
    <div>
      <p>files</p>
    </div>
  );
}

function Network({
  server,
  refetch,
}: {
  server: ServerStatus;
  refetch: () => void;
}) {
  const updatePorts = useMutation({
    mutationKey: "ports",
    mutationFn: (newPorts: string[]) => {
      return fetch(`${API_BASE_URL}/server/${server.id}/ports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ports: newPorts,
        }),
      });
    },
  });
  const [newPort, setNewPort] = useState(null);

  return (
    <div className="flex gap-2">
      {server.ports.map((port) => {
        return (
          <div
            className="px-4 flex items-center gap-2 rounded bg-header"
            key={port}
          >
            <p className="text-xl">{port}</p>
            <div
              className="p-1 bg-danger rounded"
              onClick={() =>
                updatePorts.mutate(
                  [...server.ports.filter((el) => el !== port)],
                  { onSuccess: () => refetch() }
                )
              }
            >
              <X />
            </div>
          </div>
        );
      })}
      <div className="w-fit flex flex-row gap-2 p-2 rounded bg-header">
        <input
          className="w-fit bg-border p-2 rounded outline-none"
          placeholder="Add port..."
          onChange={(value) => {
            setNewPort(value.target.value);
          }}
        />
        <button
          className="p-2 bg-success rounded"
          onClick={() =>
            updatePorts.mutate([...server.ports, newPort], {
              onSuccess: () => refetch(),
            })
          }
        >
          Add
        </button>
      </div>
    </div>
  );
}

function Startup({
  server,
  refetch,
}: {
  server: ServerStatus;
  refetch: () => void;
}) {
  const { data: serverTypes } = useQuery({
    queryKey: "serverTypes",
    queryFn: () =>
      fetch(`${API_BASE_URL}/servertypes`).then((res) => res.json()),
  });

  const updateOptions = useMutation({
    mutationKey: "options",
    mutationFn: (newOptions: { [name: string]: string }) => {
      return fetch(`${API_BASE_URL}/server/${server.id}/options`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          options: newOptions,
        }),
      });
    },
  });

  if (!serverTypes) return;
  const type: ServerType = serverTypes.find((type) => type.id === server.type);
  if (!type.options) return;

  function setOption(id: string, value: string) {
    const options = server.options;
    options[id] = value;
    updateOptions.mutate(options);
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {Object.entries(type.options).map(([id, option]) => {
        return (
          <div className="p-2 rounded bg-header" key={id}>
            <p className="text-xl mb-1">{option.name}</p>
            {option.type === "string" && (
              <input
                className="w-full bg-border p-2 rounded outline-none"
                value={server.options[id]}
                onChange={(value) => {
                  setOption(id, value.target.value);
                }}
              />
            )}
            {option.type === "enum" && (
              <Dropdown
                color="bg-border hover:bg-border-hover"
                values={option.options}
                placeholder="Select an option..."
                onSelect={(value) => {
                  setOption(id, value);
                }}
                defaultValue={server.options[id]}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
