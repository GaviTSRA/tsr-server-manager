import {
  AlertCircle,
  ArrowUpCircle,
  PlayCircle,
  Plus,
  Settings,
  StopCircle,
} from "react-feather";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Dropdown } from "../components/Dropdown";
import { Input } from "../components/Input";
import { MoonLoader } from "react-spinners";
import { trpc } from "../main";
import { AppRouter, ServerType } from "@tsm/server";
import { inferProcedureOutput } from "@trpc/server";
import { VictoryArea, VictoryAxis, VictoryChart, VictoryTheme } from "victory";

function ServerTypeDisplay({
  type,
  serverTypes,
}: {
  type: string;
  serverTypes: ServerType[];
}) {
  const data = serverTypes.find((el) => el.id === type);
  if (!data) return <p>Unknown server type {type}</p>;

  return (
    <div className="flex flex-row items-center gap-1">
      <img src={data.icon} className="w-8 rounded" />
      <p>{data.name}</p>
    </div>
  );
}

function CreateServerModal({
  close,
  serverTypes,
  nodes,
}: {
  close: () => void;
  serverTypes: inferProcedureOutput<AppRouter["serverTypes"]>;
  nodes: inferProcedureOutput<AppRouter["node"]["list"]>;
}) {
  const [createServerRunning, setCreateServerRunning] = useState(false);
  const [serverName, setServerName] = useState(undefined as string | undefined);
  const [serverType, setServerType] = useState(undefined as string | undefined);
  const [serverNode, setServerNode] = useState(undefined as string | undefined);

  const createServer = trpc.createServer.useMutation();

  return (
    <div
      className="fixed top-0 w-screen h-screen flex bg-black/75"
      onClick={close}
    >
      <div
        className="bg-neutral-200 p-4 m-auto rounded flex flex-col w-full sm:w-3/4 md:w-2/4 lg:w-1/4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-2xl mb-4 text-center">Create New Server</p>
        <div className="mb-4">
          <p className="text-secondary-text mt-2">Node</p>
          <Dropdown
            color="bg-neutral-300 hover:bg-neutral-400"
            values={nodes.map((node) => node.id)}
            render={(option) => (
              <p>
                {nodes.find((node) => node.id === option)?.name ??
                  "Unknown node"}
              </p>
            )}
            onSelect={(value: string) => {
              setServerType(undefined);
              setServerNode(value);
            }}
            placeholder="Select a node..."
          />
          <p className="text-secondary-text mt-2">Name</p>
          <Input
            className="rounded"
            onValueChange={(value) => setServerName(value)}
          />
          <p className="text-secondary-text mt-2">Type</p>
          <Dropdown
            color="bg-neutral-300 hover:bg-neutral-400"
            values={
              serverTypes
                .find((entry) => entry.nodeId === serverNode)
                ?.serverTypes.map((type) => type.id) ?? []
            }
            render={(option) => (
              <ServerTypeDisplay
                type={option}
                serverTypes={
                  serverTypes.find((entry) => entry.nodeId === serverNode)
                    ?.serverTypes ?? []
                }
              />
            )}
            onSelect={(value: string) => {
              setServerType(value);
            }}
            placeholder={
              serverNode ? "Select server type..." : "Select a node first"
            }
          />
        </div>
        <button
          className="px-4 py-2 mt-auto flex justify-center bg-primary-100 text-dark-text rounded outline-none disabled:bg-disabled"
          onClick={() => {
            setCreateServerRunning(true);
            if (!serverName || !serverType || !serverNode) return;
            createServer.mutate(
              {
                name: serverName,
                type: serverType,
                nodeId: serverNode,
              },
              {
                onSuccess: async () => {
                  setCreateServerRunning(false);
                  close();
                },
                onError: (err) => {
                  setCreateServerRunning(false);
                  alert(err);
                },
              }
            );
          }}
          disabled={
            createServerRunning ||
            serverNode === undefined ||
            serverType === undefined ||
            serverName === undefined
          }
        >
          {createServerRunning ? (
            <MoonLoader size={18} color={"#FFFFFF"} />
          ) : (
            <p>Create</p>
          )}
        </button>
      </div>
    </div>
  );
}

function Server({
  server,
  node,
  serverTypes,
}: {
  server: inferProcedureOutput<AppRouter["servers"]>[number]["servers"][number];
  node: { nodeName: string; nodeId: string };
  serverTypes: ServerType[] | undefined;
}) {
  const navigate = useNavigate();
  const axisStyle = {
    axis: {
      stroke: "#292929",
    },
    tickLabels: {
      fill: "#555",
    },
    grid: {
      stroke: "#292929",
    },
  };
  const height = 100;

  const [availableCpu, setAvailableCpu] = useState(
    undefined as number | undefined
  );
  const [availableRam, setAvailableRam] = useState(
    undefined as number | undefined
  );

  useEffect(() => {
    if (!server.recentStats || server.recentStats.length === 0) return;
    const latestStats = server.recentStats[server.recentStats.length - 1];
    if (latestStats.cpuCount) setAvailableCpu(latestStats.cpuCount * 100);

    if (latestStats.ramAvailable) {
      setAvailableRam(
        Math.round((latestStats.ramAvailable / 1024 / 1024 / 1024) * 100) / 100
      );
    } else if (latestStats.ramUsage) {
      setAvailableRam(
        Math.round((latestStats.ramUsage / 1024 / 1024 / 1024) * 100) / 100
      );
    }
  }, [server.recentStats]);

  let status = undefined;
  const statusSize = 30;
  switch (server.status) {
    case undefined:
      status = <Settings size={statusSize} className="text-gray-500" />;
      break;
    case "created":
    case "exited":
      status = <StopCircle size={statusSize} className="text-red-600" />;
      break;
    case "running":
      status = <PlayCircle size={statusSize} className="text-success" />;
      break;
    case "restarting":
      status = <ArrowUpCircle size={statusSize} className="text-gray-500" />;
      break;
    case "dead":
      status = <AlertCircle size={statusSize} className="text-red-600" />;
      break;
  }

  function range(start: number, stop: number, step: number) {
    const a = [start];
    let b = start;
    while (b < stop) {
      a.push((b += step || 1));
    }
    return a;
  }

  return (
    <div
      key={server.id}
      className="bg-neutral-200 flex flex-col hover:bg-neutral-300 transition-colors cursor-pointer px-4 py-2 rounded"
      onClick={() => navigate(`/server/${node.nodeId}/${server.id}/console`)}
    >
      <div className="flex flex-row items-center">
        <p className="text-2xl">{server.name}</p>
        <div className="ml-auto">{status}</div>
      </div>
      <p className="text-secondary-text">{server.id}</p>
      <p className="text-secondary-text mb-2">{node.nodeName}</p>
      {serverTypes && (
        <ServerTypeDisplay type={server.type} serverTypes={serverTypes ?? []} />
      )}
      {server.recentStats && server.recentStats.length > 0 && (
        <>
          <svg style={{ height: 0 }}>
            <defs>
              <linearGradient id="cpuGradient" gradientTransform="rotate(90)">
                <stop offset="0%" stopColor="#66F" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#66F" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="ramGradient" gradientTransform="rotate(90)">
                <stop offset="0%" stopColor="#6F6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#6F6" stopOpacity={0.2} />
              </linearGradient>
            </defs>
          </svg>
          <VictoryChart
            theme={VictoryTheme.clean}
            padding={{ top: 20, bottom: 20, left: 50, right: 20 }}
            height={height}
          >
            <VictoryAxis
              dependentAxis
              tickValues={
                availableCpu
                  ? range(0, availableCpu, availableCpu >= 400 ? 200 : 100)
                  : undefined
              }
              tickFormat={(value) => `${value}%`}
              style={axisStyle}
            />
            <VictoryArea
              data={server.recentStats
                ?.filter((el) => el.cpuUsage !== null)
                .map((stat, i) => ({ x: i, y: stat.cpuUsage }))}
              style={{
                data: {
                  fill: "url(#cpuGradient)",
                  stroke: "#66F",
                  strokeWidth: 2,
                },
              }}
            />
          </VictoryChart>
          <div className="px-2">
            <VictoryChart
              theme={VictoryTheme.clean}
              padding={{ top: 20, bottom: 20, left: 50, right: 20 }}
              domainPadding={{ y: 0 }}
              height={height}
            >
              <VictoryAxis
                dependentAxis
                tickValues={
                  availableRam
                    ? range(
                        0,
                        availableRam * 1024 * 1024 * 1024,
                        (availableRam * 1024 >= 4096
                          ? availableRam * 1024 >= 8192
                            ? 4096
                            : 2048
                          : 1024) *
                          1024 *
                          1024
                      )
                    : undefined
                }
                tickFormat={(value) => `${value / 1024 / 1024 / 1024} GB`}
                style={axisStyle}
              />
              <VictoryArea
                data={server.recentStats?.map((stat, i) => ({
                  x: i,
                  y: stat.ramUsage,
                }))}
                style={{
                  data: {
                    fill: "url(#ramGradient)",
                    stroke: "#6F6",
                    strokeWidth: 2,
                  },
                }}
              />
            </VictoryChart>
          </div>
        </>
      )}
    </div>
  );
}

export default function ServerList() {
  const [creatingServer, setCreatingServer] = useState(false);

  const {
    data: servers,
    error,
    refetch,
  } = trpc.servers.useQuery(undefined, {
    retry: 1,
    refetchInterval: 5000,
  });

  const { data: serverTypes } = trpc.serverTypes.useQuery();
  const { data: nodes } = trpc.node.list.useQuery({ connected: true });

  if (error && error.data?.code === "UNAUTHORIZED") {
    return <Navigate to="/login" />;
  }

  return (
    <div>
      <div className="grid grid-cols-4 m-4 gap-4">
        {servers &&
          servers.map((node) => {
            return node.servers.map((server) => {
              return (
                <Server
                  server={server}
                  node={node}
                  serverTypes={
                    serverTypes?.find((entry) => entry.nodeId === node.nodeId)
                      ?.serverTypes
                  }
                />
              );
            });
          })}
      </div>
      <div
        className="fixed bottom-0 right-0 m-8 transition-colors bg-neutral-200 flex flex-row items-center gap-2 hover:bg-neutral-300 p-2 rounded"
        onClick={() => setCreatingServer(true)}
      >
        <Plus className="text-primary-200" size={40} />
      </div>

      {creatingServer && serverTypes && nodes && (
        <CreateServerModal
          close={() => {
            setCreatingServer(false);
            refetch();
          }}
          serverTypes={serverTypes}
          nodes={nodes}
        />
      )}
    </div>
  );
}
