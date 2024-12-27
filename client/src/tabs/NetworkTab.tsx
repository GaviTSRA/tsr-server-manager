import { useState } from "react";
import { trpc } from "../main";
import { Container } from "../components/Container";
import { X } from "react-feather";
import { Input } from "../components/Input";
import { MoonLoader } from "react-spinners";
import { Error } from "../components/Error";

export function NetworkTab({ serverId }: { serverId: string }) {
  const { data: ports, error, refetch } = trpc.server.network.read.useQuery(
    { serverId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    });
  const writePorts = trpc.server.network.write.useMutation();
  const [newPort, setNewPort] = useState(null as string | null);

  if (error) {
    return <Error error={error} />
  }

  if (!ports) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {ports.map((port) => {
        return (
          <Container
            className="px-4 flex items-center gap-2 rounded bg-neutral-200"
            key={port}
          >
            <p className="text-xl">{port}</p>
            <div
              className="p-1 bg-danger rounded"
              onClick={() =>
                writePorts.mutate({
                  ports: [...ports.filter((el) => el !== port)],
                  serverId,
                }, {
                  onSuccess: () => refetch()
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
            writePorts.mutate({
              ports: [...ports, newPort],
              serverId,
            }, {
              onSuccess: () => refetch()
            });
          }}
        >
          Add
        </button>
      </Container>
    </div>
  );
}
