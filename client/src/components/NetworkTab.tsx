import { useState } from "react";
import { ServerStatus, trpc } from "../main";
import { Container } from "./Container";
import { X } from "react-feather";
import { Input } from "./Input";

export function NetworkTab({ server }: { server: ServerStatus }) {
  const updatePorts = trpc.server.setPorts.useMutation();
  const [newPort, setNewPort] = useState(null as string | null);

  return (
    <div className="flex gap-2">
      {server.ports.map((port) => {
        return (
          <Container
            className="px-4 flex items-center gap-2 rounded bg-neutral-200"
            key={port}
          >
            <p className="text-xl">{port}</p>
            <div
              className="p-1 bg-danger rounded"
              onClick={() =>
                updatePorts.mutate({
                  ports: [...server.ports.filter((el) => el !== port)],
                  serverId: server.id,
                })
              }
            >
              <X />
            </div>
          </Container>
        );
      })}
      <Container className="w-fit flex flex-row gap-2 p-2 rounded bg-neutral-200">
        <Input
          className="rounded"
          placeholder="Add port..."
          onValueChange={(value) => {
            setNewPort(value);
          }}
        />
        <button
          className="p-2 bg-success rounded"
          onClick={() => {
            if (!newPort) return;
            updatePorts.mutate({
              ports: [...server.ports, newPort],
              serverId: server.id,
            });
          }}
        >
          Add
        </button>
      </Container>
    </div>
  );
}
