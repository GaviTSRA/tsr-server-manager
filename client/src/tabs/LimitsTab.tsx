import { useEffect, useState } from "react";
import { Container } from "../components/Container";
import { trpc } from "../main";
import { MoonLoader } from "react-spinners";
import { Error } from "../components/Error";
import { UpsertInput } from "../components/UpsertInput";
import { UpsertDropdown } from "../components/UpsertDropdown";

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
  const [restartPolicy, setRestartPolicy] = useState(null as "no" | "on-failure" | "unless-stopped" | "always" | null);
  const [restartRetryCount, setRestartRetryCount] = useState(null as number | null);

  useEffect(() => {
    if (!limits) return;
    setCpuLimit(limits.cpu);
    setRamLimit(limits.ram);
    setRestartPolicy(limits.restartPolicy);
    setRestartRetryCount(limits.restartRetryCount);
  }, [limits]);

  if (error) {
    return <Error error={error} />
  }

  if (!cpuLimit || !ramLimit || !restartPolicy || !restartRetryCount) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-2">
      <div className="flex flex-col gap-2 w-full lg:w-1/2">
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
      </div>
      <div className="flex flex-col gap-2 w-full lg:w-1/2">
        <UpsertDropdown
          label="Restart Policy"
          description="The restart policy to use. no means not to restart, on-failure means to restart when there is a bad exit code, unless-stopped means to restart when the server wasn't stopped by the user and always means to always restart the container"
          values={["no", "on-failure", "unless-stopped", "always"]}
          value={restartPolicy}
          mutate={(value) => writeLimits.mutate({ restartPolicy: value as "no" | "on-failure" | "unless-stopped" | "always", serverId })}
          error={writeLimits.error}
          fetching={writeLimits.isPending}
          success={writeLimits.isSuccess}
        />
        <UpsertInput
          label="Restart Retry Count"
          description="How often to try restarting when using the on-failure restart policy"
          value={restartRetryCount}
          type="number"
          mutate={(value) => writeLimits.mutate({ restartRetryCount: Number.parseInt(value), serverId })}
          error={writeLimits.error}
          fetching={writeLimits.isPending}
          success={writeLimits.isSuccess}
        />
      </div>
    </div>
  );
}
