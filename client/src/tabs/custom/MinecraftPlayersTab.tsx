import { Rss } from "react-feather";
import { Container } from "../../components/Container";
import { Server } from "../../main";
import { MoonLoader } from "react-spinners";

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
  if (!server) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 h-full">
      <Container
        className="h-fit"
        expanded={true}
        title={
          <div className="flex flex-row gap-2">
            <Rss size={20} />
            <p className="font-bold">
              Online Players:{" "}
              {server.metadata.players ? server.metadata.players.length : 0}
            </p>
          </div>
        }
      >
        <div className="flex flex-row gap-6 h-full flex-wrap">
          {server.metadata.players &&
            server.metadata.players.map((player: string) => (
              <MinecraftPlayer name={player} key={player} />
            ))}
        </div>
      </Container>
    </div>
  );
}
