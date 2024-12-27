import { trpc } from "../main";
import { Container } from "../components/Container";
import { MoonLoader } from "react-spinners";
import { Error } from "../components/Error";
import { UpsertInput } from "../components/UpsertInput";
import { UpsertDropdown } from "../components/UpsertDropdown";

export function StartupTab({ serverId, serverType }: { serverId: string, serverType: string }) {
  const { data: serverTypes, error: serverTypesError } = trpc.serverTypes.useQuery();
  const { data: options, refetch: refetchOptions, error: optionsError } = trpc.server.startup.read.useQuery(
    {
      serverId
    },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  );
  const writeStartup = trpc.server.startup.write.useMutation();

  if (serverTypesError) {
    return <Error error={serverTypesError} />
  }
  if (optionsError) {
    return <Error error={optionsError} />
  }

  if (!serverTypes || !options) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }
  const type = serverTypes.find((type) => type.id === serverType);
  if (!type || !type.options) return;

  function setOption(id: string, value: string) {
    if (!options) return;
    const newOptions = options;
    newOptions[id] = value;
    writeStartup.mutate({ serverId: serverId, options: newOptions }, {
      onSuccess: () => refetchOptions()
    });
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(type.options).map(([id, option]) => {
        return (
          <Container className="p-2 rounded bg-neutral-200 h-fit" key={id}>
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
              <></>
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
              <></>
            )}
          </Container>
        );
      })}
    </div>
  );
}
