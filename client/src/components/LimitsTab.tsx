import { useMutation } from "react-query";
import { ServerStatus } from "../../types";
import { useState } from "react";
import { Container } from "./Container";
import { Input } from "./Input";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

export function LimitsTab({
  server,
  refetch,
}: {
  server: ServerStatus;
  refetch: () => void;
}) {
  const [cpuLimit, setCpuLimit] = useState(server.cpuLimit);
  const [ramLimit, setRamLimit] = useState(server.ramLimit);

  const updateLimits = useMutation({
    mutationKey: "options",
    mutationFn: () => {
      return fetch(`${API_BASE_URL}/server/${server.id}/limits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limits: {
            cpu: cpuLimit,
            ram: ramLimit,
          },
        }),
      });
    },
  });

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
          updateLimits.mutate();
        }}
      >
        Save
      </button>
    </div>
  );
}
