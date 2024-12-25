import { useEffect, useState } from "react";
import { Container } from "./Container";
import { Input } from "./Input";
import { trpc } from "../main";
import { MoonLoader } from "react-spinners";
import { Lock } from "react-feather";

export function LimitsTab({ serverId }: { serverId: string }) {
  const {
    data: limits,
    refetch,
    error,
  } = trpc.server.limits.read.useQuery(
    { serverId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  );
  const setLimits = trpc.server.limits.write.useMutation();

  const [cpuLimit, setCpuLimit] = useState(null as number | null);
  const [ramLimit, setRamLimit] = useState(null as number | null);

  useEffect(() => {
    if (!limits) return;
    setCpuLimit(limits.cpu);
    setRamLimit(limits.ram);
  }, [limits]);

  if (error && error.data?.httpStatus === 401) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Lock className="text-danger" size={80} />
      </div>
    );
  }

  if (!cpuLimit || !ramLimit) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

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
          setLimits.mutate(
            { cpuLimit, ramLimit, serverId: serverId },
            {
              onSuccess: () => {
                refetch();
              },
              onError: (err) => {
                alert(err);
              },
            }
          );
        }}
      >
        Save
      </button>
    </div>
  );
}
