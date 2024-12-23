import { ServerStatus } from "../../types";
import { useState } from "react";
import { Container } from "./Container";
import { Input } from "./Input";
import { trpc } from "../main";

export function LimitsTab({ server }: { server: ServerStatus }) {
  const [cpuLimit, setCpuLimit] = useState(server.cpuLimit);
  const [ramLimit, setRamLimit] = useState(server.ramLimit);

  const setLimits = trpc.server.setLimits.useMutation();

  return (
    <div className="grid grid-cols-4 gap-2">
      <Container className="p-2 rounded bg-neutral-200">
        <p className="text-xl mb-1">CPU Limit</p>
        <Input
          className="rounded"
          value={cpuLimit.toString()}
          onValueChange={(value) => {
            setCpuLimit(Number.parseFloat(value));
          }}
          type="number"
        />
      </Container>
      <Container className="p-2 rounded bg-neutral-200">
        <p className="text-xl mb-1">RAM Limit</p>
        <Input
          className="rounded"
          value={ramLimit.toString()}
          onValueChange={(value) => {
            setRamLimit(Number.parseInt(value));
          }}
          type="number"
        />
      </Container>
      <button
        className="fixed bottom-0 right-0 mb-4 mr-4 bg-success text-2xl text-black px-2 py-1 rounded"
        onClick={() => {
          setLimits.mutate({ cpuLimit, ramLimit, serverId: server.id });
        }}
      >
        Save
      </button>
    </div>
  );
}
