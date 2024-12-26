import { useEffect, useState } from "react";
import { Container } from "./Container";
import { trpc } from "../main";
import { MoonLoader } from "react-spinners";
import { Error } from "./Error";
import { UpsertInput } from "./UpsertInput";

export function LimitsTab({ serverId }: { serverId: string }) {
  const {
    data: limits,
    error,
  } = trpc.server.limits.read.useQuery(
    { serverId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  );
  const setCpu = trpc.server.limits.write.useMutation();
  const setRam = trpc.server.limits.write.useMutation();

  const [cpuLimit, setCpuLimit] = useState(null as number | null);
  const [ramLimit, setRamLimit] = useState(null as number | null);

  useEffect(() => {
    if (!limits) return;
    setCpuLimit(limits.cpu);
    setRamLimit(limits.ram);
  }, [limits]);

  if (error) {
    return <Error error={error} />
  }

  if (!cpuLimit || !ramLimit) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Container className="p-2 rounded bg-neutral-200">
        <UpsertInput
          label="CPU Limit"
          description="Maximum amount of CPU the server may use"
          value={cpuLimit}
          type="text"
          mutate={(value) => setCpu.mutate({ cpuLimit: Number.parseFloat(value), serverId })}
          error={setCpu.error}
          fetching={setCpu.isPending}
          success={setCpu.isSuccess}
        />
      </Container>
      <Container className="p-2 rounded bg-neutral-200">
        <UpsertInput
          label="RAM Limit"
          description="Maximum amount of RAM the server may use"
          value={ramLimit}
          type="number"
          mutate={(value) => setRam.mutate({ ramLimit: Number.parseInt(value), serverId })}
          error={setRam.error}
          fetching={setRam.isPending}
          success={setRam.isSuccess}
        />
      </Container>
    </div>
  );
}
