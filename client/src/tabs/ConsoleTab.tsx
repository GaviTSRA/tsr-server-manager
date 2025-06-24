import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import AnsiToHtml from "ansi-to-html";
import { trpc } from "../main";
import { Input } from "../components/Input";
import { Container } from "../components/Container";
import { ArrowDown, ArrowUp, Check, Cpu, Rss, Server } from "react-feather";
import { VictoryArea, VictoryAxis, VictoryChart, VictoryTheme } from "victory";
import { Error, ErrorType } from "../components/Error";
import { MoonLoader } from "react-spinners";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@tsm/server";
import { useServerQueryParams } from "../useServerQueryParams";

export function ConsoleTab({
  stats,
  statsError,
  logs,
  logsError,
}: {
  stats: inferProcedureOutput<AppRouter["server"]["status"]> | undefined;
  statsError: ErrorType | null;
  logs: string[];
  logsError: ErrorType | null;
}) {
  const { nodeId, serverId } = useServerQueryParams();

  const ansiConverter = new AnsiToHtml();
  const consoleRef = useRef(null as HTMLDivElement | null);
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
  const [availableCpu, setAvailableCpu] = useState(
    undefined as number | undefined
  );
  const [usedRam, setUsedRam] = useState(0);
  const [availableRam, setAvailableRam] = useState(
    undefined as number | undefined
  );
  const [networkIn, setNetworkIn] = useState(0);
  const [networkOut, setNetworkOut] = useState(0);

  useEffect(() => {
    if (!stats || stats.length === 0) return;
    const latestStats = stats[stats.length - 1];
    if (latestStats.cpuUsage)
      setCPUUsage(Math.round(latestStats.cpuUsage * 100) / 100);
    if (latestStats.cpuCount) setAvailableCpu(latestStats.cpuCount * 100);
    if (latestStats.ramUsage)
      setUsedRam(
        Math.round((latestStats.ramUsage / 1024 / 1024 / 1024) * 100) / 100
      );
    if (latestStats.networkIn) {
      setNetworkIn(Math.round(latestStats.networkIn / 1024));
    }
    if (latestStats.networkOut) {
      setNetworkOut(Math.round(latestStats.networkOut / 1024));
    }
    if (latestStats.ramAvailable) {
      setAvailableRam(
        Math.round((latestStats.ramAvailable / 1024 / 1024 / 1024) * 100) / 100
      );
    } else if (latestStats.ramUsage) {
      setAvailableRam(
        Math.round((latestStats.ramUsage / 1024 / 1024 / 1024) * 100) / 100
      );
    }
  }, [stats]);

  const [command, setCommand] = useState("");

  const runCommand = trpc.server.run.useMutation();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand.mutate(
        { command, serverId, nodeId },
        {
          onSuccess: () => setCommand(""),
        }
      );
    }
  };

  function range(start: number, stop: number, step: number) {
    const a = [start];
    let b = start;
    while (b < stop) {
      a.push((b += step || 1));
    }
    return a;
  }

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

  const [height, setHeight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    setHeight(ref.current.clientHeight);
  });
  const chartHeight = 220;
  // const chartHeight = useMemo(() => {
  //   console.info(height);
  //   if (height < 600) return height - 42;
  //   return Math.max(0, height / 3 - 90);
  // }, [height]);

  return (
    <div className="w-full h-full flex flex-col lg:grid lg:grid-rows-[0fr_3fr_1fr] 2xl:flex 2xl:flex-row">
      <svg style={{ height: 0, width: 0 }}>
        <defs>
          <linearGradient id="cpuGradient" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="#66F" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#66F" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="ramGradient" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="#6F6" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#6F6" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="networkInGradient" gradientTransform="rotate(90)">
            <stop offset="0%" stopColor="#0CC" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#0CC" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient
            id="networkOutGradient"
            gradientTransform="rotate(90)"
          >
            <stop offset="0%" stopColor="#F90" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#F90" stopOpacity={0.2} />
          </linearGradient>
        </defs>
      </svg>
      <div className="bg-neutral-150 border-neutral-400 border-x-1 border-t-1 mt-auto text-secondary-text w-full 2xl:w-2/3 h-full rounded-xl flex flex-col relative">
        {logsError ? (
          <Container className="h-full rounded-b-none!" expanded={true}>
            <Error error={logsError} />
          </Container>
        ) : (
          <div
            className="px-2 pb-4 overflow-y-auto text-wrap"
            ref={consoleRef}
            onScroll={handleScroll}
          >
            {logs.map((log, index) => (
              <div
                key={index}
                className="break-words text-wrap max-w-full"
                dangerouslySetInnerHTML={{
                  __html: ansiConverter.toHtml(log),
                }}
              />
            ))}
          </div>
        )}

        <div className="sticky bottom-0 mt-auto h-fit flex flex-row">
          <Input
            placeholder="Enter a command..."
            value={command}
            onValueChange={(value) => setCommand(value)}
            onKeyDown={handleKeyDown}
            className="rounded-bl-lg peer"
          />
          <div className="px-1 flex items-center bg-neutral-300 rounded-br-lg border-b-2 border-neutral-400 peer-focus:border-primary-100 transition-colors duration-300">
            {runCommand.isPending && <MoonLoader size={20} color="white" />}
            {runCommand.error && (
              <Error error={runCommand.error} size="small" />
            )}
            {runCommand.isSuccess && (
              <Check size={20} color={"green"} strokeWidth={4} />
            )}
          </div>
        </div>
      </div>
      <div
        className="2xl:mx-4 w-full mt-4 2xl:mt-0 2xl:w-1/3 flex flex-col gap-2 h-full"
        ref={ref}
      >
        {statsError ? (
          <Container expanded={true} className="h-full">
            <Error error={statsError} />
          </Container>
        ) : stats ? (
          <div
            className="flex flex-col lg:flex-row 2xl:flex-col place-content-between h-full gap-4"
            ref={ref}
          >
            <Container
              className="p-0!"
              title={
                <div className="flex flex-row items-center w-full gap-2">
                  <Cpu size={20} />
                  <p className="font-bold">CPU Usage</p>
                  <div className="ml-auto flex flex-row gap-2">
                    <p>{Number.isNaN(cpuUsage) ? 0 : cpuUsage} %</p>
                    {availableCpu && (
                      <p className="text-secondary-text">/ {availableCpu} %</p>
                    )}
                  </div>
                </div>
              }
            >
              <VictoryChart
                theme={VictoryTheme.clean}
                height={chartHeight}
                padding={{ top: 20, bottom: 20, left: 50, right: 20 }}
              >
                <VictoryAxis
                  dependentAxis
                  tickValues={
                    availableCpu
                      ? range(0, availableCpu, availableCpu >= 400 ? 100 : 50)
                      : undefined
                  }
                  tickFormat={(value) => `${value}%`}
                  style={axisStyle}
                />
                <VictoryArea
                  data={stats
                    .filter((el) => el.cpuUsage !== null)
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
            </Container>
            <Container
              className="p-0!"
              title={
                <div className="flex flex-row items-center w-full gap-2">
                  <Server size={20} />
                  <p className="font-bold">RAM Usage</p>
                  <div className="ml-auto flex flex-row gap-2">
                    <p>{Number.isNaN(usedRam) ? 0 : usedRam} GB</p>
                    {availableRam && (
                      <p className="text-secondary-text">/ {availableRam} GB</p>
                    )}
                  </div>
                </div>
              }
            >
              <div className="px-2">
                <VictoryChart
                  theme={VictoryTheme.clean}
                  padding={{ top: 20, bottom: 20, left: 50, right: 20 }}
                  height={chartHeight}
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
                                ? 2048
                                : 1024
                              : 512) *
                              1024 *
                              1024
                          )
                        : undefined
                    }
                    tickFormat={(value) => `${value / 1024 / 1024 / 1024} GB`}
                    style={axisStyle}
                  />
                  <VictoryArea
                    data={stats.map((stat, i) => ({ x: i, y: stat.ramUsage }))}
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
            </Container>
            <Container
              className="p-0!"
              title={
                <div className="flex flex-row items-center w-full gap-2">
                  <Rss size={20} />
                  <p className="font-bold">Network Usage</p>
                  <div className="ml-auto flex flex-row gap-2">
                    <div className="flex flex-row items-center">
                      <p>{networkIn} KB</p>
                      <ArrowDown />
                    </div>
                    <div className="ml-2 flex flex-row items-center">
                      <p>{networkOut} KB</p>
                      <ArrowUp />
                    </div>
                  </div>
                </div>
              }
            >
              <div className="px-2">
                <VictoryChart
                  theme={VictoryTheme.clean}
                  padding={{ top: 20, bottom: 20, left: 70, right: 20 }}
                  height={chartHeight}
                >
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(value) => `${Math.round(value / 1024)} KB`}
                    style={axisStyle}
                  />
                  <VictoryArea
                    data={stats.map((stat, i) => ({
                      x: i,
                      y: stat.networkOut,
                    }))}
                    style={{
                      data: {
                        fill: "url(#networkOutGradient)",
                        stroke: "#F90",
                        strokeWidth: 2,
                      },
                    }}
                  />
                  <VictoryArea
                    data={stats.map((stat, i) => ({
                      x: i,
                      y: stat.networkIn,
                    }))}
                    style={{
                      data: {
                        fill: "url(#networkInGradient)",
                        stroke: "#0CC",
                        strokeWidth: 2,
                      },
                    }}
                  />
                </VictoryChart>
              </div>
            </Container>
          </div>
        ) : (
          <Container
            expanded={true}
            className="h-full w-full flex items-center justify-center"
          >
            <MoonLoader color={"#FFFFFF"} />
          </Container>
        )}
      </div>
    </div>
  );
}
