import { useEffect, useMemo, useState } from "react";
import {
  PlayCircle,
  Terminal,
  File,
  StopCircle,
  ArrowUpCircle,
  AlertCircle,
  Server as ServerIcon,
  Cpu,
  Settings,
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
import { motion } from "motion/react";
import { ServerControls } from "./components/ServerControls";

type Tab = {
  id: string;
  title: string;
  icon: JSX.Element;
  tab: JSX.Element;
  custom?: boolean;
};

function ServerTab({
  tab,
  index,
  serverId,
  nodeId,
  selected,
}: {
  selected: boolean;
  tab: Tab;
  index: number;
  serverId: string;
  nodeId: string;
}) {
  return (
    <motion.div
      initial={{
        x: -50,
        opacity: 0,
      }}
      animate={{
        x: 0,
        opacity: 1,
      }}
      transition={{
        delay: index * 0.02,
      }}
      className={
        "w-full rounded border-neutral-400 border-l-4 cursor-pointer select-none transition-colors " +
        (selected
          ? "bg-neutral-150 border-l-primary-100"
          : "bg-neutral-200 hover:bg-neutral-300")
      }
    >
      <Link to={`/server/${nodeId}/${serverId}/${tab.id}`} key={tab.id}>
        <div className="mx-auto flex flex-row gap-2 px-2 py-1">
          {tab.icon}
          <p>{tab.title}</p>
        </div>
      </Link>
    </motion.div>
  );
}

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

  // const [status, setStatus] = useState("");
  const [statusIcon, setStatusIcon] = useState(null as JSX.Element | null);
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

  useEffect(() => {
    if (!server) return;
    if (server.status === "running") {
      if (wasOffline) {
        resetLogs();
      }
      setWasOffline(false);
    } else {
      setWasOffline(true);
    }
    switch (server.status) {
      case undefined:
        setStatusIcon(<Settings size={30} className="text-gray-500" />);
        // setStatus("Not Configured");
        break;
      case "created":
      case "exited":
        setStatusIcon(<StopCircle size={30} className="text-red-600" />);
        // setStatus("Stopped");
        break;
      case "running":
        setStatusIcon(<PlayCircle size={30} className="text-success" />);
        // setStatus("Running");
        break;
      case "restarting":
        setStatusIcon(<ArrowUpCircle size={30} className="text-gray-500" />);
        // setStatus("Restarting");
        break;
      case "dead":
        setStatusIcon(<AlertCircle size={30} className="text-red-600" />);
        // setStatus("Dead");
        break;
    }
  }, [server]);

  const { data: stats, error: statsError } = trpc.server.status.useQuery(
    {
      serverId,
      nodeId,
    },
    {
      enabled: serverId !== undefined && queryEnabled,
      retry: 1,
      refetchInterval: 1000,
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

  const tabs: Tab[] = useMemo(
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
    [server, serverId, stats, statsError, logs, logsError, nodeId]
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
          <div className="p-2 rounded flex flex-col gap-2 border-neutral-150 border-b-4 rounded-b-lg">
            {!server && (
              <div className="w-full py-1 flex items-center justify-center">
                {screenWidth < 600 && (
                  <Menu
                    size={30}
                    onClick={() => setsidebarOpen(!sidebarOpen)}
                  />
                )}
                <MoonLoader size={18} color={"#FFFFFF"} />
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
                </div>
                <div className="flex flex-row items-center gap-2 mb-2">
                  <p className="text-2xl mr-auto">{server.name}</p>
                  {statusIcon}
                </div>
                <ServerControls serverId={serverId} nodeId={nodeId} status={server.status} />
              </div>
            )}
          </div>
          <div className="w-full h-full gap-2 flex flex-col items-center p-2">
            {tabs
              .filter((tab) => !tab.custom)
              .map((data, index) => {
                if (data.custom) return;
                return (
                  <ServerTab
                    selected={data.id === tab}
                    tab={data}
                    key={index}
                    index={index}
                    nodeId={nodeId}
                    serverId={serverId}
                  />
                );
              })}
            {tabs.filter((tab) => tab.custom && customTabs.includes(tab.id))
              .length > 0 && (
                <motion.div
                  className="w-full flex flex-row gap-2 items-center"
                  initial={{
                    x: -50,
                    opacity: 0,
                  }}
                  animate={{
                    x: 0,
                    opacity: 1,
                  }}
                  transition={{
                    delay: tabs.filter((tab) => !tab.custom).length * 0.02,
                  }}
                >
                  <div className="w-full border-b-2 border-neutral-400"></div>
                  <p className="text-neutral-500">Custom</p>
                  <div className="w-full border-b-2 border-neutral-400"></div>
                </motion.div>
              )}
            {tabs
              .filter((tab) => tab.custom && customTabs.includes(tab.id))
              .map((data, index) => {
                return (
                  <ServerTab
                    selected={data.id === tab}
                    tab={data}
                    key={index}
                    index={index + tabs.filter((tab) => !tab.custom).length}
                    nodeId={nodeId}
                    serverId={serverId}
                  />
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
