import { KeyboardEvent, useEffect, useRef, useState } from "react";
import AnsiToHtml from "ansi-to-html";
import { trpc } from "../main";
import { Input } from "../components/Input";
import { Container } from "../components/Container";
import { Check, Cpu, Server } from "react-feather";
import { VictoryArea, VictoryAxis, VictoryChart, VictoryTheme } from "victory";
import { Error, ErrorType } from "../components/Error";
import { MoonLoader } from "react-spinners";

export function ConsoleTab({
  serverId,
  stats,
  statsError,
  logs,
  logsError,
}: {
  serverId: string;
  stats: {
    cpuUsage: number;
    cpuAvailable?: number;
    ramUsage: number;
    ramAvailable?: number;
  }[];
  statsError: ErrorType | null,
  logs: string[];
  logsError: ErrorType | null,
}) {
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
  const [availableCpu, setAvailableCpu] = useState(undefined as number | undefined);
  const [usedRam, setUsedRam] = useState(0);
  const [availableRam, setAvailableRam] = useState(undefined as number | undefined);
  useEffect(() => {
    if (!stats || stats.length === 0) return;
    const latestStats = stats[stats.length - 1];
    if (latestStats.cpuUsage) setCPUUsage(Math.round(latestStats.cpuUsage * 100) / 100);
    if (latestStats.cpuAvailable) setAvailableCpu(latestStats.cpuAvailable * 100);
    if (latestStats.ramUsage)
      setUsedRam(Math.round((latestStats.ramUsage / 1024 / 1024 / 1024) * 100) / 100);
    if (latestStats.ramAvailable) {
      setAvailableRam(
        Math.round((latestStats.ramAvailable / 1024 / 1024 / 1024) * 100) / 100
      );
    } else if (latestStats.ramUsage) {
      setAvailableRam(Math.round((latestStats.ramUsage / 1024 / 1024 / 1024) * 100) / 100)
    }
  }, [stats]);

  const [command, setCommand] = useState("");

  const runCommand = trpc.server.run.useMutation();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand.mutate({ command, serverId }, {
        onSuccess: () => setCommand("")
      });
    }
  };

  function range(start: number, stop: number, step: number) {
    var a = [start], b = start;
    while (b < stop) {
      a.push(b += step || 1);
    }
    return a;
  }

  return (
    <div className="w-full h-full flex flex-col lg:flex-row">
      <div className="bg-black mt-auto text-secondary-text w-full lg:w-2/3 h-full rounded-lg flex flex-col relative">
        {logsError ? (
          <Container className="h-full">
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
          <div
            className="px-1 flex items-center bg-neutral-300 rounded-br-lg border-b-2 border-neutral-400 peer-focus:border-primary-100 transition-colors duration-300"
          >
            {runCommand.isPending && <MoonLoader size={20} color="white" />}
            {runCommand.error && <Error error={runCommand.error} size="small" />}
            {runCommand.isSuccess && <Check size={20} color={"green"} strokeWidth={4} />}
          </div>
        </div>
      </div>
      <div className="lg:mx-4 w-full mt-4 lg:mt-0 lg:w-1/3 flex flex-col gap-2">
        {statsError ? (
          <Container className="h-full" >
            <Error error={statsError} />
          </Container>
        ) : (
          <div className="flex flex-col md:flex-row lg:flex-col gap-4">
            <Container className="flex flex-col">
              <div className="flex flex-row items-center gap-2 p-2">
                <Cpu />
                <p>{Number.isNaN(cpuUsage) ? 0 : cpuUsage} %</p>
                {availableCpu && (
                  <p className="text-secondary-text">
                    / {availableCpu} %
                  </p>
                )}
              </div>
              <VictoryChart
                theme={VictoryTheme.clean}
                padding={{ top: 20, bottom: 20, left: 50, right: 20 }}
              >
                <VictoryAxis
                  dependentAxis
                  tickValues={availableCpu
                    ? range(0, availableCpu,
                      availableCpu >= 500 ? 100 : 50
                    )
                    : undefined}
                  tickFormat={(value) => `${value}%`}
                  style={{
                    tickLabels: {
                      fill: "#909090"
                    },
                    grid: {
                      stroke: "#444",
                    },
                  }}
                />
                <VictoryArea
                  data={
                    stats.filter(el => el.cpuUsage !== null).map((stat, i) => ({ x: i, y: stat.cpuUsage }))
                  }
                  style={{
                    data: {
                      fill: "#66F",
                      fillOpacity: 0.3,
                      stroke: "#66F",
                      strokeWidth: 2,
                    },
                  }}
                />
              </VictoryChart>
            </Container>
            <Container className="overflow-hidden">
              <div className="flex flex-row items-center gap-2 p-2">
                <Server />
                <p>{Number.isNaN(usedRam) ? 0 : usedRam} GB </p>
                {availableRam && (
                  <p className="text-secondary-text">
                    / {availableRam} GB
                  </p>
                )}
              </div>
              <VictoryChart
                theme={VictoryTheme.clean}
                padding={{ top: 10, bottom: 40, left: 50, right: 20 }}
                domainPadding={{ y: 0 }}
              >
                <VictoryAxis
                  dependentAxis
                  tickValues={availableRam
                    ? range(0,
                      availableRam * 1024 * 1024 * 1024,
                      (availableRam >= 8192
                        ? (availableRam >= 16384 ? 2048 : 1024)
                        : 512)
                      * 1024 * 1024)
                    : undefined
                  }
                  tickFormat={(value) => `${value / 1024 / 1024 / 1024} GB`}
                  style={{
                    tickLabels: {
                      fill: "#909090"
                    },
                    grid: {
                      stroke: "#444",
                    },
                  }}
                />
                <VictoryArea
                  data={
                    stats.map((stat, i) => ({ x: i, y: stat.ramUsage }))
                  }
                  style={{
                    data: {
                      fill: "#6F6",
                      fillOpacity: 0.3,
                      stroke: "#6F6",
                      strokeWidth: 2,
                    },
                  }}
                />
              </VictoryChart>
            </Container>
          </div >
        )}
      </div >
    </div >
  );
}
