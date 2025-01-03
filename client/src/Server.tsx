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
  Users,
  Menu,
} from "react-feather";
import { Link, useParams } from "react-router-dom";
import { Error } from "./components/Error";
import { LimitsTab } from "./tabs/LimitsTab";
import { trpc } from "./main";
import { ConsoleTab } from "./tabs/ConsoleTab";
import { NetworkTab } from "./tabs/NetworkTab";
import { StartupTab } from "./tabs/StartupTab";
import { FilesTab } from "./tabs/FilesTab";
import { MoonLoader } from "react-spinners";
import { UsersTab } from "./tabs/UsersTab";

export function Server() {
  const { serverId, tab } = useParams() as {
    serverId: string,
    tab: "Console" | "Files" | "Network" | "Startup" | "Limits"
  };
  const [queryEnabled, setQueryEnabled] = useState(true);
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
    cpuAvailable?: number;
    ramUsage: number;
    ramAvailable?: number;
  }[]);
  const [logs, setLogs] = useState([] as string[]);
  const [wasOffline, setWasOffline] = useState(
    server ? server.status !== "running" : false
  );
  const [sidebarOpen, setsidebarOpen] = useState(true);

  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
        setStatusIcon(<Settings size={30} className="text-gray-500" />);
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
      <ConsoleTab serverId={serverId} stats={stats} statsError={statsError} logs={logs} logsError={logsError} />,
    ],
    Files: [<File />, <FilesTab serverId={serverId} />],
    Network: [<ServerIcon />, <NetworkTab serverId={serverId} />],
    Startup: [<PlayCircle />, server ? <StartupTab serverId={serverId} serverType={server.type} /> : <></>],
    Limits: [<Cpu />, <LimitsTab serverId={serverId} />],
    Users: [<Users />, <UsersTab serverId={serverId} />]
  };

  if (error) {
    return <Error error={error} />
  }

  return (
    <div className="w-full flex flex-row h-full bg-neutral-100 text-primary-text" >
      {sidebarOpen && (
        <div
          className={"h-full flex flex-col bg-neutral-200 shadow-[0px_0_10px_10px_rgba(0,0,0,0.2)] rounded-r-xl" +
            (screenWidth < 600 ? " absolute z-50" : "")
          }
        >
          <div className="p-2 rounded flex flex-col gap-2">
            {!server && (
              <div className="w-full py-2 flex items-center justify-center">
                {screenWidth < 600 && <Menu size={30} onClick={() => setsidebarOpen(!sidebarOpen)} />}
                <MoonLoader size={30} color={"#FFFFFF"} />
              </div>
            )}
            {server && (
              <div className="flex flex-col">
                <div className="flex flex-row">
                  {screenWidth < 600 && <Menu size={30} onClick={() => setsidebarOpen(!sidebarOpen)} />}
                  <p className="text-2xl mx-auto">{server.name}</p>

                </div>
                <div className="flex flex-row items-center gap-2">
                  {statusIcon}
                  <p>{status}</p>
                </div>
              </div>
            )}
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
              <Link
                className={
                  "w-full py-2 px-2 rounded border-neutral-400 border-l-4 cursor-pointer select-none transition-colors " +
                  (tab === name
                    ? "bg-neutral-100 border-l-primary-100"
                    : "bg-neutral-200 hover:bg-neutral-300")
                }
                to={`/server/${serverId}/${name}`}
                key={name}
              >
                <div className="mx-auto flex flex-row gap-2">
                  {icon}
                  <p>{name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      {!sidebarOpen && (
        <Menu size={30} onClick={() => setsidebarOpen(!sidebarOpen)} className="flex m-2" />
      )}
      {!tabs[tab] &&
        <Error error={{ data: { httpStatus: 404, code: "NOT_FOUND" }, message: "", shape: undefined }} />
      }
      {tabs[tab] && (
        <div className="w-full max-h-full overflow-y-auto p-4">
          {tabs[tab][1]}
        </div>
      )}
    </div>
  );
}
