import { Rss, Shield, X } from "react-feather";
import { Container } from "../../components/Container";
import { Server, trpc } from "../../main";
import { MoonLoader } from "react-spinners";
import { useServerQueryParams } from "../../useServerQueryParams";
import { Error } from "../../components/Error";

function MinecraftPlayer({ name }: { name: string }) {
  return (
    <div className="flex flex-row items-center gap-2">
      <img src={`https://mc-heads.net/avatar/${name}`} className="h-8" />
      <p>{name}</p>
    </div>
  );
}

export function MinecraftPlayersTab({
  server,
}: {
  server: Server | undefined;
}) {
  const { serverId, nodeId } = useServerQueryParams();

  const {
    data: players,
    error: playersError,
    isFetching: playersFetching,
  } = trpc.server.custom.mcForge.getPlayers.useQuery(
    {
      serverId,
      nodeId,
    },
    { retry: false }
  );
  const {
    data: ops,
    error: opsError,
    isFetching: opsFetching,
  } = trpc.server.custom.mcForge.getOps.useQuery(
    {
      serverId,
      nodeId,
    },
    { retry: false }
  );

  if (!server) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      <Container
        className="h-fit"
        title={
          <div className="flex flex-row items-center gap-2">
            <Rss size={20} />
            <p className="font-bold">Online Players</p>
          </div>
        }
      >
        <div className="flex flex-row gap-6 h-full flex-wrap">
          {players &&
            players.map((player: string) => (
              <MinecraftPlayer name={player} key={player} />
            ))}
          {playersError && <Error error={playersError} />}
          {playersFetching && (
            <div className="flex flex-col items-center w-full">
              <MoonLoader size={40} color="#fff" />
            </div>
          )}
          {(!players || players.length === 0) &&
            !playersFetching &&
            !playersError && (
              <div className="flex flex-col items-center w-full">
                <X />
                <p className="text-secondary-text">No players online</p>
              </div>
            )}
        </div>
      </Container>
      <Container
        className="h-fit"
        title={
          <div className="flex flex-row items-center gap-2">
            <Shield size={20} />
            <p className="font-bold">OP Players</p>
          </div>
        }
      >
        <div className="flex flex-row gap-6 h-full flex-wrap">
          {ops &&
            ops.map((player: string) => (
              <MinecraftPlayer name={player} key={player} />
            ))}
          {opsError && <Error error={opsError} />}
          {opsFetching && !ops && (
            <div className="flex flex-col items-center w-full">
              <MoonLoader size={40} color="#fff" />
            </div>
          )}
          {(!ops || ops.length === 0) && !opsFetching && !opsError && (
            <div className="flex flex-col items-center w-full">
              <X />
              <p className="text-secondary-text">No OPs</p>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
