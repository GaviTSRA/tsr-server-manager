import { useEffect, useState } from "react";
import { Container } from "../components/Container";
import { trpc } from "../main";
import { MoonLoader } from "react-spinners";
import { Error } from "../components/Error";
import { UpsertInput } from "../components/UpsertInput";

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
  const writeLimits = trpc.server.limits.write.useMutation();

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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      <Container className="p-2 rounded bg-neutral-200 h-fit">
        <UpsertInput
          label="CPU Limit"
          description="Maximum amount of CPU the server may use"
          value={cpuLimit}
          type="text"
          mutate={(value) => writeLimits.mutate({ cpuLimit: Number.parseFloat(value), serverId })}
          error={writeLimits.error}
          fetching={writeLimits.isPending}
          success={writeLimits.isSuccess}
        />
      </Container>
      <Container className="p-2 rounded bg-neutral-200 h-fit">
        <UpsertInput
          label="RAM Limit"
          description="Maximum amount of RAM the server may use"
          value={ramLimit}
          type="number"
          mutate={(value) => writeLimits.mutate({ ramLimit: Number.parseInt(value), serverId })}
          error={writeLimits.error}
          fetching={writeLimits.isPending}
          success={writeLimits.isSuccess}
        />
      </Container>
    </div>
  );
}
