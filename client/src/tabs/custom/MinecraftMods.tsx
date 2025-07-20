import { MoonLoader } from "react-spinners";
import { Server, trpc } from "../../main";
import { useServerQueryParams } from "../../useServerQueryParams";
import { Error } from "../../components/Error";
import { Container } from "../../components/Container";
import { Package } from "react-feather";
import { NodeRouter } from "@tsm/node";
import { inferProcedureOutput } from "@trpc/server";

function ModEntry({ mod }: { mod: inferProcedureOutput<NodeRouter["server"]["custom"]["mcForge"]["getMods"]>[number] }) {
  if (!mod.success) {
    return <p>Failed to parse mod {mod.fileName}: {mod.error}</p>
  }


  return (
    <div className="flex flex-row items-center h-32 relative overflow-hidden w-1/3 rounded">
      <div className="bg-gradient-to-r absolute from-black/70 to-50% z-10 w-full h-full" />
      <img src={mod.logo} className="absolute right-0 rounded" />
      <div className="z-20 px-2 py-1">
        <p className="text-2xl font-bold">{mod.name}</p>
        <p>{mod.id}</p>
        <p>{mod.version}</p>
      </div>
    </div>
  )
}

export function MinecraftModsTab({
  server,
}: {
  server: Server | undefined;
}) {
  const { serverId, nodeId } = useServerQueryParams();

  const {
    data,
    error,
    isFetching,
  } = trpc.server.custom.mcForge.getMods.useQuery(
    {
      serverId,
      nodeId,
    },
    { retry: false, refetchOnWindowFocus: false }
  );

  if (!server || isFetching) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  if (error) {
    return <Error error={error} />
  }

  return <div>
    <Container
      title={<>
        <Package />
        <p>Mods</p>
      </>}
    >
      <div className="flex flex-row flex-wrap gap-4">
        {data && data.map(mod => (
          <ModEntry mod={mod} />
        ))}
      </div>
    </Container>
  </div>
}