import { trpc } from "../main";
import { MoonLoader } from "react-spinners";
import { Error } from "../components/Error";
import { UpsertInput } from "../components/UpsertInput";
import { UpsertDropdown } from "../components/UpsertDropdown";
import { useServerQueryParams } from "../Server";

export function StartupTab({
  serverType,
}: {
  serverType: string | undefined;
}) {
  const { nodeId, serverId } = useServerQueryParams();
  const { data: serverTypes, error: serverTypesError } =
    trpc.serverTypes.useQuery();
  const {
    data: options,
    refetch: refetchOptions,
    error: optionsError,
  } = trpc.server.startup.read.useQuery(
    {
      serverId,
      nodeId,
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  );
  const writeStartup = trpc.server.startup.write.useMutation();

  if (serverTypesError) {
    return <Error error={serverTypesError} />;
  }
  if (optionsError) {
    return <Error error={optionsError} />;
  }

  if (!serverTypes || !options || !serverType) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }
  const type = serverTypes
    .find((entry) => entry.nodeId === nodeId)
    ?.serverTypes.find((type) => type.id === serverType);
  if (!type || !type.options) return;

  function setOption(id: string, value: string) {
    if (!options) return;
    const newOptions = options;
    newOptions[id] = value;
    writeStartup.mutate(
      { serverId: serverId, options: newOptions, nodeId },
      {
        onSuccess: () => refetchOptions(),
      }
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      {Object.entries(type.options).map(([id, option]) => {
        return (
          <div key={id}>
            {option.type === "string" ? (
              <UpsertInput
                label={option.name}
                description={option.description}
                value={options[id]}
                type="text"
                mutate={(value) => setOption(id, value)}
                error={writeStartup.error}
                fetching={writeStartup.isPending}
                success={writeStartup.isSuccess}
              />
            ) : (
              <div className="hidden"></div>
            )}
            {option.type === "enum" ? (
              <UpsertDropdown
                label={option.name}
                description={option.description}
                values={option.options ?? []}
                mutate={(value) => {
                  setOption(id, value);
                }}
                value={options[id]}
                error={writeStartup.error}
                fetching={writeStartup.isPending}
                success={writeStartup.isSuccess}
              />
            ) : (
              <div className="hidden"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
