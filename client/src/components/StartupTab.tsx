import { ServerStatus, trpc } from "../main";
import { Container } from "./Container";
import { Dropdown } from "./Dropdown";
import { Input } from "./Input";

export function StartupTab({ server }: { server: ServerStatus }) {
  const { data: serverTypes } = trpc.serverTypes.useQuery();
  const setOptions = trpc.server.setOptions.useMutation();

  if (!serverTypes) return;
  const type = serverTypes.find((type) => type.id === server.type);
  if (!type || !type.options) return;

  function setOption(id: string, value: string) {
    const options = server.options;
    options[id] = value;
    setOptions.mutate({ serverId: server.id, options });
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {Object.entries(type.options).map(([name, option]) => {
        return (
          <Container className="p-2 rounded bg-neutral-200" key={name}>
            <p className="text-xl mb-1">{name}</p>
            {option.type === "string" ? (
              <Input
                className="rounded"
                value={server.options[name]}
                onValueChange={(value) => {
                  setOption(name, value);
                }}
              />
            ) : (
              <></>
            )}
            {option.type === "enum" ? (
              <Dropdown
                color="bg-neutral-300 hover:bg-neutral-400"
                values={option.options}
                placeholder="Select an option..."
                onSelect={(value) => {
                  setOption(name, value);
                }}
                defaultValue={server.options[name]}
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
