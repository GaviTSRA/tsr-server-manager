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
import { Input } from "./components/Input";
import { Container } from "./components/Container";

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

  const [startButtonEnabled, setStartButtonEnabled] = useState(false);
  const [restartButtonEnabled, setRestartButtonEnabled] = useState(false);
  const [stopButtonEnabled, setStopButtonEnabled] = useState(false);
  const [killButtonEnabled, setKillButtonEnabled] = useState(false);
  const [status, setStatus] = useState("");
  const [statusIcon, setStatusIcon] = useState(null);
  const [logs, setLogs] = useState([] as string[]);

  const startServer = useMutation("start", async () => {
    const response = await fetch(`${API_BASE_URL}/server/${serverId}/start`, {
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
      return fetch(`${API_BASE_URL}/server/${serverId}/restart`, {
        method: "POST",
      });
    },
  });
  const stopServer = useMutation({
    mutationKey: "stop",
    mutationFn: () => {
      return fetch(`${API_BASE_URL}/server/${serverId}/stop`, {
        method: "POST",
      });
    },
  });
  const killServer = useMutation({
    mutationKey: "kill",
    mutationFn: () => {
      return fetch(`${API_BASE_URL}/server/${serverId}/kill`, {
        method: "POST",
      });
    },
  });

  useEffect(() => {
    if (!server) return;
    switch (server.status) {
      case undefined:
        setStartButtonEnabled(true);
        setRestartButtonEnabled(false);
        setStopButtonEnabled(false);
        setKillButtonEnabled(false);
        setStatusIcon(<Settings size={40} className="text-gray-500" />);
        setStatus("Not Configured");
        break;
      case "created":
      case "exited":
        setStartButtonEnabled(true);
        setRestartButtonEnabled(false);
        setStopButtonEnabled(false);
        setKillButtonEnabled(false);
        setStatusIcon(<StopCircle size={30} className="text-red-600" />);
        setStatus("Stopped");
        break;
      case "running":
        setStartButtonEnabled(false);
        setRestartButtonEnabled(true);
        setStopButtonEnabled(true);
        setKillButtonEnabled(true);
        setStatusIcon(<PlayCircle size={30} className="text-success" />);
        setStatus("Running");
        break;
      case "restarting":
        setStartButtonEnabled(false);
        setRestartButtonEnabled(false);
        setStopButtonEnabled(false);
        setKillButtonEnabled(true);
        setStatusIcon(<ArrowUpCircle size={30} className="text-gray-500" />);
        setStatus("Restarting");
        break;
      case "dead":
        setStartButtonEnabled(true);
        setRestartButtonEnabled(false);
        setStopButtonEnabled(false);
        setKillButtonEnabled(false);
        setStatusIcon(<AlertCircle size={30} className="text-red-600" />);
        setStatus("Dead");
        break;
    }
  }, [server]);

  const fetchLogs = async () => {
    const response = await fetch(`${API_BASE_URL}/server/${serverId}/connect`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.body.getReader();
  };

  const { data: logStream } = useQuery("serverLogs", fetchLogs, {
    refetchOnWindowFocus: false,
    refetchInterval: () => false,
    refetchOnMount: false,
  });

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

  const tabs = server
    ? {
        Console: [<Terminal />, <Console server={server} logs={logs} />],
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

  if (!server) return <></>;

  return (
    <div className="w-full h-full flex flex-row bg-neutral-100 text-primary-text">
      <div className="h-full flex flex-col bg-neutral-200 shadow-[0px_0_10px_10px_rgba(0,0,0,0.2)] rounded-r-xl">
        <div className="p-2 rounded flex flex-col gap-2">
          <p className="text-2xl">{server.name}</p>
          <div className="flex flex-row items-center gap-2">
            {statusIcon}
            <p>{status}</p>
          </div>
          <div className="flex rounded-xl flex-row shadow-[0_0_3px_2px_rgba(0,0,0,0.3)]">
            <PlayCircle
              size={40}
              className={
                `p-2 rounded-l-lg border-neutral-400 border-1 ` +
                (startButtonEnabled
                  ? "bg-neutral-400 hover:bg-green-800"
                  : "bg-neutral-200")
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
                `p-2 border-neutral-400 border-1 ` +
                (restartButtonEnabled
                  ? "bg-neutral-400 hover:bg-danger"
                  : "bg-neutral-100")
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
                `p-2 border-neutral-400 border-1 ` +
                (stopButtonEnabled
                  ? "bg-neutral-400 hover:bg-danger"
                  : "bg-neutral-100")
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
                `p-2 rounded-r-lg border-neutral-400 border-1 ` +
                (killButtonEnabled
                  ? "bg-neutral-400 hover:bg-danger"
                  : "bg-neutral-100")
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
        <div className="w-full h-full gap-2 flex flex-col items-center p-2">
          {Object.keys(tabs).map((name) => (
            <div
              className={
                "w-full py-2 px-2 rounded border-neutral-400 border-l-4 cursor-pointer select-none transition-colors " +
                (selectedTab === name
                  ? "bg-neutral-100 border-l-primary-100"
                  : "bg-neutral-200 hover:bg-neutral-300")
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
      </div>
      {server && (
        <div className="w-full h-full overflow-y-auto p-4">
          {tabs[selectedTab][1]}
        </div>
      )}
    </div>
  );
}

function Console({ server, logs }: { server: ServerStatus; logs: string[] }) {
  const ansiConverter = new AnsiToHtml();
  const consoleRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

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

  const [command, setCommand] = useState("");

  const runCommand = useMutation({
    mutationKey: "runCmd",
    mutationFn: (command: string) => {
      return fetch(`${API_BASE_URL}/server/${server.id}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          command,
        }),
      });
    },
  });

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand.mutate(command);
      setCommand("");
    }
  };

  return (
    <div className="w-full h-full flex flex-row">
      <div
        className="bg-black mt-auto text-secondary-text w-2/3 h-full rounded flex flex-col overflow-auto relative"
        ref={consoleRef}
        onScroll={handleScroll}
      >
        <div className="px-2 pb-4">
          {logs.map((log, index) => (
            <div
              key={index}
              dangerouslySetInnerHTML={{
                __html: ansiConverter.toHtml(log),
              }}
            />
          ))}
        </div>

        <div className="sticky bottom-0 mt-auto h-fit">
          <Input
            placeholder="Enter a command..."
            value={command}
            onValueChange={(value) => setCommand(value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
      <div className="mx-4 w-1/3 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Container className="flex flex-col gap-2">
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
          </Container>
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
          <Container
            className="px-4 flex items-center gap-2 rounded bg-neutral-200"
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
          </Container>
        );
      })}
      <Container className="w-fit flex flex-row gap-2 p-2 rounded bg-neutral-200">
        <Input
          className="rounded"
          placeholder="Add port..."
          onValueChange={(value) => {
            setNewPort(value);
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
      </Container>
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
          <Container className="p-2 rounded bg-neutral-200" key={id}>
            <p className="text-xl mb-1">{option.name}</p>
            {option.type === "string" && (
              <Input
                className="rounded"
                value={server.options[id]}
                onValueChange={(value) => {
                  setOption(id, value);
                }}
              />
            )}
            {option.type === "enum" && (
              <Dropdown
                color="bg-neutral-300 hover:bg-neutral-400"
                values={option.options}
                placeholder="Select an option..."
                onSelect={(value) => {
                  setOption(id, value);
                }}
                defaultValue={server.options[id]}
              />
            )}
          </Container>
        );
      })}
    </div>
  );
}
