import { useEffect, useState } from "react";
import {
  PlayCircle,
  Terminal,
  File,
  StopCircle,
  ArrowUpCircle,
  AlertCircle,
  RotateCw,
  Server as ServerIcon,
  X,
  Cpu,
  Settings,
  Square,
  Play,
} from "react-feather";
import { useParams } from "react-router-dom";
import { Error } from "./components/Error";
import { LimitsTab } from "./tabs/LimitsTab";
import { trpc } from "./main";
import { ConsoleTab } from "./tabs/ConsoleTab";
import { NetworkTab } from "./tabs/NetworkTab";
import { StartupTab } from "./tabs/StartupTab";
import { FilesTab } from "./tabs/FilesTab";
import { MoonLoader } from "react-spinners";

export function Server() {
  const { serverId } = useParams() as { serverId: string };
  const [queryEnabled, setQueryEnabled] = useState(true);
  const [selectedTab, setSelectedTab] = useState(
    "Console" as "Console" | "Files" | "Network" | "Startup" | "Limits"
  );
  const { data: server, error } = trpc.server.server.useQuery(
    { serverId },
    {
      enabled: serverId !== undefined && queryEnabled,
      retry: 1,
      refetchInterval: 1000,
    }
  );

  useEffect(() => {
    if (error) {
      setQueryEnabled(false);
    }
  }, [error])

  const [startButtonEnabled, setStartButtonEnabled] = useState(false);
  const [restartButtonEnabled, setRestartButtonEnabled] = useState(false);
  const [stopButtonEnabled, setStopButtonEnabled] = useState(false);
  const [killButtonEnabled, setKillButtonEnabled] = useState(false);
  const [status, setStatus] = useState("");
  const [statusIcon, setStatusIcon] = useState(null as JSX.Element | null);
  const [stats, setStats] = useState([] as {
    cpuUsage: number;
    ramUsage: number;
    ramAvailable: number;
  }[]);
  const [logs, setLogs] = useState([] as string[]);
  const [wasOffline, setWasOffline] = useState(
    server ? server.status !== "running" : false
  );

  const startServer = trpc.server.power.start.useMutation();
  const restartServer = trpc.server.power.restart.useMutation();
  const stopServer = trpc.server.power.stop.useMutation();
  const killServer = trpc.server.power.kill.useMutation();

  useEffect(() => {
    if (!server) return;
    if (server.status === "running") {
      if (wasOffline) {
        resetStats();
        resetLogs();
      }
      setWasOffline(false);
    } else {
      setWasOffline(true);
    }
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

  const { data: statsSub, reset: resetStats, error: statsError } = trpc.server.status.useSubscription(
    { serverId },
    {
      onError: (err) => {
        console.error(err);
      },
    }
  );
  const { data: logsSub, reset: resetLogs, error: logsError } = trpc.server.logs.useSubscription(
    { serverId },
    {
      onError: (err) => {
        console.error(err);
      },
    }
  );

  useEffect(() => {
    if (!statsSub) return;
    setStats((prev) => {
      let prevEntries = prev;
      if (prev.length > 40) {
        prevEntries = prev.slice(prev.length - 40, prev.length);
      }
      console.info([...prevEntries, statsSub])
      return [...prevEntries, statsSub];
    });
  }, [statsSub]);
  useEffect(() => {
    if (!logsSub) return;
    setLogs((prev) => {
      let prevEntries = prev;
      if (prev.length > 1000) {
        prevEntries = prev.slice(prev.length - 1000, prev.length);
      }
      return [...prevEntries, ...logsSub.split("\n").filter((el) => el !== "")];
    });
  }, [logsSub]);

  const tabs = {
    Console: [
      <Terminal />,
      server ? <ConsoleTab serverId={serverId} stats={stats} statsError={statsError} logs={logs} logsError={logsError} /> : <></>,
    ],
    Files: [<File />, server ? <FilesTab serverId={serverId} /> : <></>],
    Network: [<ServerIcon />, server ? <NetworkTab serverId={serverId} /> : <></>],
    Startup: [<PlayCircle />, server ? <StartupTab serverId={serverId} serverType={server.type} /> : <></>],
    Limits: [<Cpu />, server ? <LimitsTab serverId={serverId} /> : <></>],
  };

  if (error) {
    return <Error error={error} />
  }

  if (!server) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-row bg-neutral-100 text-primary-text">
      <div className="h-full flex flex-col bg-neutral-200 shadow-[0px_0_10px_10px_rgba(0,0,0,0.2)] rounded-r-xl">
        <div className="p-2 rounded flex flex-col gap-2">
          <p className="text-2xl mx-auto">{server.name}</p>
          <div className="flex flex-row items-center gap-2">
            {statusIcon}
            <p>{status}</p>
          </div>
          <div className="flex rounded-xl flex-row">
            <Play
              size={40}
              className={
                `p-2 rounded-l-lg border-neutral-400 border-1 ` +
                (startButtonEnabled
                  ? "bg-neutral-300 hover:bg-green-800"
                  : "bg-neutral-100")
              }
              onClick={() => {
                if (startButtonEnabled) {
                  startServer.mutate({ serverId });
                }
              }}
            />
            <RotateCw
              size={40}
              className={
                `p-2 border-neutral-400 border-1 ` +
                (restartButtonEnabled
                  ? "bg-neutral-300 hover:bg-danger"
                  : "bg-neutral-100")
              }
              onClick={() => {
                if (restartButtonEnabled) {
                  restartServer.mutate({ serverId });
                }
              }}
            />
            <Square
              size={40}
              className={
                `p-2 border-neutral-400 border-1 ` +
                (stopButtonEnabled
                  ? "bg-neutral-300 hover:bg-danger"
                  : "bg-neutral-100")
              }
              onClick={() => {
                if (stopButtonEnabled) {
                  stopServer.mutate({ serverId });
                }
              }}
            />
            <X
              size={40}
              className={
                `p-2 rounded-r-lg border-neutral-400 border-1 ` +
                (killButtonEnabled
                  ? "bg-neutral-300 hover:bg-danger"
                  : "bg-neutral-100")
              }
              onClick={() => {
                if (killButtonEnabled) {
                  killServer.mutate({ serverId });
                }
              }}
            />
          </div>
        </div>
        <div className="w-full h-full gap-2 flex flex-col items-center p-2">
          {Object.entries(tabs).map(([name, [icon]]) => (
            <div
              className={
                "w-full py-2 px-2 rounded border-neutral-400 border-l-4 cursor-pointer select-none transition-colors " +
                (selectedTab === name
                  ? "bg-neutral-100 border-l-primary-100"
                  : "bg-neutral-200 hover:bg-neutral-300")
              }
              onClick={() =>
                setSelectedTab(
                  name as "Console" | "Files" | "Network" | "Startup" | "Limits"
                )
              }
              key={name}
            >
              <div className="mx-auto flex flex-row gap-2">
                {icon}
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
