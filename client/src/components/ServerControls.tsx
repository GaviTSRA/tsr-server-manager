import { Play, Square } from "react-feather";
import { trpc } from "../main";
import { MoonLoader } from "react-spinners";

export function ServerControls({
  serverId,
  nodeId,
  status,
}: {
  serverId: string;
  nodeId: string;
  status:
    | "created"
    | "running"
    | "paused"
    | "restarting"
    | "removing"
    | "exited"
    | "dead"
    | undefined;
}) {
  const startServer = trpc.server.power.start.useMutation();
  const stopServer = trpc.server.power.stop.useMutation();
  const killServer = trpc.server.power.kill.useMutation();

  const genericClassName =
    "cursor-pointer bg-neutral-400 rounded-lg px-2 py-1 w-full h-full flex flex-row gap-2 items-center text-center";

  let controls: JSX.Element = <p>Unhandled</p>;
  if (startServer.isPending || stopServer.isPending || killServer.isPending) {
    controls = (
      <div className={genericClassName + " justify-center"}>
        <MoonLoader size={20} color={"#fff"} />
      </div>
    );
  } else if (
    status === undefined ||
    status === "created" ||
    status === "exited"
  ) {
    controls = (
      <div
        onClick={() => startServer.mutate({ serverId, nodeId })}
        className={genericClassName + " hover:bg-green-800"}
      >
        <Play size={24} />
        <p>Start</p>
      </div>
    );
  } else if (status === "running") {
    controls = (
      <div
        onClick={() => stopServer.mutate({ serverId, nodeId })}
        className={genericClassName + " hover:bg-danger"}
      >
        <Square size={24} />
        <p>Stop</p>
      </div>
    );
  }

  return (
    <div className="text-lg w-full">
      {controls}
      {/*
      <X
        size={40}
        className={
          `p-2 rounded-r-lg border-neutral-400 border-1 ` +
          (killButtonEnabled
            ? "bg-neutral-300 hover:bg-danger"
            : "bg-neutral-150")
        }
        onClick={() => {
          if (killButtonEnabled) {
            killServer.mutate({ serverId, nodeId });
          }
        }}
      /> */}
    </div>
  );
}
