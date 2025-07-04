import { useState } from "react";
import { trpc } from "../main";
import { Container } from "../components/Container";
import { Plus, X } from "react-feather";
import { Input } from "../components/Input";
import { MoonLoader } from "react-spinners";
import { Error } from "../components/Error";
import { useServerQueryParams } from "../useServerQueryParams";
import { Button } from "../components/Button";

export function NetworkTab() {
  const { nodeId, serverId } = useServerQueryParams();
  const {
    data: ports,
    error,
    refetch,
  } = trpc.server.network.read.useQuery(
    { serverId, nodeId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  );
  const writePorts = trpc.server.network.write.useMutation();
  const [newPort, setNewPort] = useState(null as string | null);

  if (error) {
    return <Error error={error} />;
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
            className="px-4 flex items-center gap-2 rounded-sm bg-neutral-200"
            key={port}
          >
            <p className="text-xl">{port}</p>
            <Button
              variant="danger"
              onClick={() =>
                writePorts.mutate(
                  {
                    ports: [...ports.filter((el) => el !== port)],
                    serverId,
                    nodeId,
                  },
                  {
                    onSuccess: () => refetch(),
                  }
                )
              }
              icon={<X />}
            />
          </Container>
        );
      })}
      <Container className="w-fit flex flex-row gap-2 rounded-sm bg-neutral-200">
        <Input
          className="rounded-sm"
          placeholder="Add port..."
          onValueChange={(value) => {
            setNewPort(value);
          }}
        />
        <Button
          onClick={() => {
            if (!newPort) return;
            writePorts.mutate(
              {
                ports: [...ports, newPort],
                serverId,
                nodeId,
              },
              {
                onSuccess: () => refetch(),
              }
            );
          }}
          disabled={!newPort || writePorts.isPending}
          variant="confirm"
          icon={<Plus />}
        >
          Add
        </Button>
      </Container>
    </div>
  );
}
