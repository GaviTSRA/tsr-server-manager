import { MoonLoader } from "react-spinners";
import { Server, trpc } from "../../main";
import { useServerQueryParams } from "../../useServerQueryParams";
import { Error } from "../../components/Error";
import { Container } from "../../components/Container";
import { Download, Package } from "react-feather";
import { NodeRouter } from "@tsm/node";
import { inferProcedureOutput } from "@trpc/server";
import { Input } from "../../components/Input";
import { useState } from "react";
import { Button } from "../../components/Button";

// function InstalledMod({
//   mod,
// }: {
//   mod: inferProcedureOutput<
//     NodeRouter["server"]["custom"]["factorio"]["searchMods"]
//   >["mods"][number];
// }) {
//   return (
//     <div className="flex flex-row items-center h-32 relative overflow-hidden w-1/3 rounded">
//       <div className="bg-gradient-to-r absolute from-black/70 to-50% z-10 w-full h-full" />
//       <img src={mod.logo} className="absolute right-0 rounded" />
//       <div className="z-20 px-2 py-1">
//         <p className="text-2xl font-bold">{mod.name}</p>
//         <p>{mod.id}</p>
//         <p>{mod.version}</p>
//       </div>
//     </div>
//   );
// }

function Mod({
  mod,
  installable,
  enabled,
  refetch,
}: {
  mod: inferProcedureOutput<
    NodeRouter["server"]["custom"]["factorio"]["searchMods"]
  >["mods"][number];
  installable?: boolean;
  enabled?: boolean;
  refetch?: () => void;
}) {
  const { nodeId, serverId } = useServerQueryParams();

  let latestRelease = undefined;
  if (mod.releases && mod.releases.length > 0) {
    latestRelease = mod.releases.reduce((latest, current) => {
      return !latest || current.released_at > latest.released_at
        ? current
        : latest;
    });
  }

  const updateModList = trpc.server.custom.factorio.updateModList.useMutation();
  const installMod = trpc.server.custom.factorio.installMod.useMutation();

  return (
    <div className="flex flex-row items-center relative w-2/3 overflow-hidden rounded">
      <img
        src={`https://assets-mod.factorio.com${mod.thumbnail}`}
        className="rounded w-24 h-24"
      />
      <div className="z-20 px-2 py-1">
        <p className="text-2xl font-bold">{mod.title}</p>
        <p className="text-sm">
          By {mod.owner} - v{latestRelease?.version}
        </p>
        <p className="text-secondary-text">{mod.summary}</p>
      </div>
      {installable && (
        <Button
          onClick={() =>
            installMod.mutate(
              {
                name: mod.name,
                version: latestRelease?.version || "",
                nodeId,
                serverId,
              },
              {
                onSuccess: () => alert("Mod installed!"),
                onError: (error) =>
                  alert("Error installing mod: " + error.message),
              }
            )
          }
        >
          Install
        </Button>
      )}
      {enabled !== undefined && (
        <Button
          onClick={() =>
            updateModList.mutate(
              {
                serverId,
                nodeId,
                name: mod.name,
                enabled: !enabled,
              },
              {
                onSuccess: () => refetch?.(),
                onError: (error) =>
                  alert("Error toggling mod: " + error.message),
              }
            )
          }
        >
          {enabled ? "Disable" : "Enable"}
        </Button>
      )}
    </div>
  );
}

function InstalledMods() {
  const { serverId, nodeId } = useServerQueryParams();

  const { data, error, isFetching, refetch } =
    trpc.server.custom.factorio.getInstalledMods.useQuery(
      {
        serverId,
        nodeId,
      },
      {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: -1,
      }
    );

  if (error) {
    return <Error error={error} />;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {data &&
          data.map((mod) => (
            <Mod
              key={mod.info.name}
              mod={mod.info}
              enabled={mod.enabled}
              refetch={refetch}
            />
          ))}
        {isFetching && (
          <div className="w-full h-full flex p-4 items-center justify-center">
            <MoonLoader size={50} color={"#FFFFFF"} />
          </div>
        )}
      </div>
    </>
  );
}

function DownloadMods() {
  const { serverId, nodeId } = useServerQueryParams();

  const [searchString, setSearchString] = useState("");
  const [page, setPage] = useState("1");

  const { data, error, isFetching } =
    trpc.server.custom.factorio.searchMods.useQuery(
      {
        serverId,
        nodeId,
        page: parseInt(page) || 1,
        search: searchString || undefined,
      },
      { retry: false, refetchOnWindowFocus: false }
    );

  if (error) {
    return <Error error={error} />;
  }
  return (
    <>
      <div className="flex flex-row gap-4 py-2">
        <Input
          placeholder="Search mods..."
          value={searchString}
          className="rounded"
          onValueChange={(value) => setSearchString(value)}
        />
        <Input
          placeholder="Page"
          value={page}
          className="rounded"
          onValueChange={(value) => setPage(value)}
        />
      </div>
      <div className="flex flex-col gap-4">
        {data &&
          data.mods.map((mod) => <Mod key={mod.name} mod={mod} installable />)}
        {isFetching && (
          <div className="w-full h-full flex p-4 items-center justify-center">
            <MoonLoader size={50} color={"#FFFFFF"} />
          </div>
        )}
      </div>
    </>
  );
}

export function FactorioModsTab({ server }: { server: Server | undefined }) {
  if (!server) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  return (
    <div>
      <Container
        tabs={[
          {
            title: (
              <>
                <Package />
                <p>Installed Mods</p>
              </>
            ),
            content: <InstalledMods />,
          },
          {
            title: (
              <>
                <Download />
                <p>Download Mods</p>
              </>
            ),
            content: <DownloadMods />,
          },
        ]}
      />
    </div>
  );
}
