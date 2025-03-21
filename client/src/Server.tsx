import { useEffect, useMemo, useState } from "react";
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
  Book,
  Rss,
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
import { LogsTab } from "./tabs/LogsTab";
import { MinecraftPlayersTab } from "./tabs/custom/MinecraftPlayersTab";

export function Server() {
  const { nodeId, serverId, tab } = useParams() as {
    serverId: string;
    nodeId: string;
    tab: "Console" | "Files" | "Network" | "Startup" | "Limits";
  };
  const [queryEnabled, setQueryEnabled] = useState(true);
  const { data: server, error } = trpc.server.server.useQuery(
    { nodeId, serverId },
    {
      enabled: serverId !== undefined && queryEnabled,
      retry: 1,
      refetchInterval: 1000,
    }
  );
  const { data: serverTypes, error: serverTypesError } =
    trpc.serverTypes.useQuery();

  const [customTabs, setCustomTabs] = useState([] as string[]);

  useEffect(() => {
    if (server && server.type && serverTypes) {
      const type = serverTypes
        .find((type) => type.nodeId === nodeId)
        ?.serverTypes.find((type) => type.id === server.type);
      if (type && type.tabs) {
        setCustomTabs(type.tabs);
      } else {
        setCustomTabs([]);
      }
    }
  }, [server, serverTypes, nodeId]);

  useEffect(() => {
    if (error) {
      setQueryEnabled(false);
    }
  }, [error]);

  const [startButtonEnabled, setStartButtonEnabled] = useState(false);
  const [restartButtonEnabled, setRestartButtonEnabled] = useState(false);
  const [stopButtonEnabled, setStopButtonEnabled] = useState(false);
  const [killButtonEnabled, setKillButtonEnabled] = useState(false);
  const [status, setStatus] = useState("");
  const [statusIcon, setStatusIcon] = useState(null as JSX.Element | null);
  const [stats, setStats] = useState(
    [] as {
      cpuUsage: number;
      cpuAvailable?: number;
      ramUsage: number;
      ramAvailable?: number;
    }[]
  );
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

  const {
    data: statsSub,
    reset: resetStats,
    error: statsError,
  } = trpc.server.status.useSubscription(
    { serverId, nodeId },
    {
      onError: (err) => {
        console.error(err);
      },
    }
  );
  const { reset: resetLogs, error: logsError } =
    trpc.server.consoleLogs.useSubscription(
      { serverId, nodeId },
      {
        onData: (data) => {
          setLogs((prev) => {
            let prevEntries = prev;
            if (prev.length > 1000) {
              prevEntries = prev.slice(prev.length - 1000, prev.length);
            }
            return [
              ...prevEntries,
              ...data.split("\n").filter((el) => el !== ""),
            ];
          });
        },
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

  const tabs = useMemo(
    () => [
      {
        id: "console",
        title: "Console",
        icon: <Terminal />,
        tab: (
          <ConsoleTab
            serverId={serverId}
            stats={stats}
            statsError={statsError}
            logs={logs}
            logsError={logsError}
            nodeId={nodeId}
          />
        ),
      },
      {
        id: "files",
        title: "Files",
        icon: <File />,
        tab: <FilesTab serverId={serverId} nodeId={nodeId} />,
      },
      {
        id: "network",
        title: "Network",
        icon: <ServerIcon />,
        tab: <NetworkTab serverId={serverId} nodeId={nodeId} />,
      },
      {
        id: "startup",
        title: "Startup",
        icon: <PlayCircle />,
        tab: (
          <StartupTab
            serverId={serverId}
            serverType={server?.type}
            nodeId={nodeId}
          />
        ),
      },
      {
        id: "limits",
        title: "Limits",
        icon: <Cpu />,
        tab: <LimitsTab serverId={serverId} nodeId={nodeId} />,
      },
      {
        id: "users",
        title: "Users",
        icon: <Users />,
        tab: <UsersTab serverId={serverId} nodeId={nodeId} />,
      },
      {
        id: "logs",
        title: "Logs",
        icon: <Book />,
        tab: <LogsTab serverId={serverId} nodeId={nodeId} />,
      },
      {
        id: "mc-players",
        title: "Players",
        icon: <Rss />,
        tab: <MinecraftPlayersTab server={server} />,
        custom: true,
      },
    ],
    [server, serverId, stats, statsError, logs, logsError]
  );

  const selectedTab = useMemo(
    () => tabs.find((data) => data.id === tab),
    [tabs, tab]
  );

  if (error) {
    return <Error error={error} />;
  }
  if (serverTypesError) {
    return <Error error={serverTypesError} />;
  }

  return (
    <div className="w-full flex flex-row h-full bg-neutral-100 text-primary-text">
      {sidebarOpen && (
        <div
          className={
            "h-full flex flex-col bg-neutral-200" +
            (screenWidth < 600 ? " absolute z-50" : "")
          }
        >
          <div className="p-2 rounded flex flex-col gap-2">
            {!server && (
              <div className="w-full py-2 flex items-center justify-center">
                {screenWidth < 600 && (
                  <Menu
                    size={30}
                    onClick={() => setsidebarOpen(!sidebarOpen)}
                  />
                )}
                <MoonLoader size={30} color={"#FFFFFF"} />
              </div>
            )}
            {server && (
              <div className="flex flex-col">
                <div className="flex flex-row">
                  {screenWidth < 600 && (
                    <Menu
                      size={30}
                      onClick={() => setsidebarOpen(!sidebarOpen)}
                    />
                  )}
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
                    startServer.mutate({ serverId, nodeId });
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
                    restartServer.mutate({ serverId, nodeId });
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
                    stopServer.mutate({ serverId, nodeId });
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
                    killServer.mutate({ serverId, nodeId });
                  }
                }}
              />
            </div>
          </div>
          <div className="w-full h-full gap-2 flex flex-col items-center p-2">
            {tabs.map((data) => {
              if (data.custom && !customTabs.includes(data.id)) return;
              return (
                <Link
                  className={
                    "w-full py-2 px-2 rounded border-neutral-400 border-l-4 cursor-pointer select-none transition-colors " +
                    (tab === data.id
                      ? "bg-neutral-100 border-l-primary-100"
                      : "bg-neutral-200 hover:bg-neutral-300")
                  }
                  to={`/server/${nodeId}/${serverId}/${data.id}`}
                  key={data.id}
                >
                  <div className="mx-auto flex flex-row gap-2">
                    {data.icon}
                    <p>{data.title}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      {!sidebarOpen && (
        <Menu
          size={30}
          onClick={() => setsidebarOpen(!sidebarOpen)}
          className="flex m-2"
        />
      )}
      {!selectedTab && (
        <Error
          error={{
            data: { httpStatus: 404, code: "NOT_FOUND" },
            message: "",
            shape: undefined,
          }}
        />
      )}
      {selectedTab && (
        <div className="w-full h-screen box-border overflow-y-auto p-4">
          {selectedTab.tab}
        </div>
      )}
    </div>
  );
}
