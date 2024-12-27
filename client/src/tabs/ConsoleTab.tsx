import { KeyboardEvent, useEffect, useRef, useState } from "react";
import AnsiToHtml from "ansi-to-html";
import { ServerStatus, trpc } from "../main";
import { Input } from "../components/Input";
import { Container } from "../components/Container";
import { Cpu, Server } from "react-feather";

export function ConsoleTab({
  server,
  logs,
}: {
  server: ServerStatus;
  logs: string[];
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
  const [usedRam, setUsedRam] = useState(0);
  const [availableRam, setAvailableRam] = useState(0);
  useEffect(() => {
    if (server.cpuUsage) setCPUUsage(Math.round(server.cpuUsage * 100) / 100);
    if (server.usedRam)
      setUsedRam(Math.round((server.usedRam / 1024 / 1024 / 1024) * 100) / 100);
    if (server.availableRam)
      setAvailableRam(
        Math.round((server.availableRam / 1024 / 1024 / 1024) * 100) / 100
      );
  }, [server]);

  const [command, setCommand] = useState("");

  const runCommand = trpc.server.run.useMutation();

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand.mutate({ command, serverId: server.id });
      setCommand("");
    }
  };

  return (
    <div className="w-full h-full flex flex-row">
      <div
        className="bg-black mt-auto text-secondary-text w-2/3 h-full rounded-lg flex flex-col relative"
        ref={consoleRef}
        onScroll={handleScroll}
      >
        <div className="px-2 pb-4 overflow-auto">
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
            className="rounded-b-lg"
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
              <Server />
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
