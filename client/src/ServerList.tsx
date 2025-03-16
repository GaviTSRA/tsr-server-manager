import {
  AlertCircle,
  ArrowUpCircle,
  PlayCircle,
  Plus,
  Settings,
  StopCircle,
} from "react-feather";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Dropdown } from "./components/Dropdown";
import { Input } from "./components/Input";
import { MoonLoader } from "react-spinners";
import { trpc } from "./main";
import { ServerType } from "@tsm/server";

function ServerTypeDisplay({
  type,
  serverTypes,
}: {
  type: string;
  serverTypes: ServerType[];
}) {
  const data = serverTypes.find((el) => el.id === type);
  if (!data) return <p>Unknown server type {type}</p>;

  return (
    <div className="flex flex-row items-center gap-1">
      <img src={data.icon} className="w-8 rounded" />
      <p>{data.name}</p>
    </div>
  );
}

function CreateServerModal({ close }: { close: () => void }) {
  const [createServerRunning, setCreateServerRunning] = useState(false);
  const [serverName, setServerName] = useState("");
  const [serverType, setServerType] = useState("");

  const createServer = trpc.createServer.useMutation();

  return (
    <div
      className="fixed top-0 w-screen h-screen flex bg-black/75"
      onClick={close}
    >
      <div
        className="bg-neutral-200 p-4 m-auto rounded flex flex-col w-full sm:w-3/4 md:w-2/4 lg:w-1/4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-2xl mb-4 text-center">Create New Server</p>
        <div className="mb-4">
          <p className="text-secondary-text">Name</p>
          <Input
            className="rounded"
            onValueChange={(value) => setServerName(value)}
          />
          <p className="text-secondary-text mt-2">Type</p>
          {/* <Dropdown
            color="bg-neutral-300 hover:bg-neutral-400"
            values={serverTypes.map((type) => type.id)}
            render={(option) => (
              <ServerTypeDisplay type={option} serverTypes={serverTypes} />
            )}
            onSelect={(value: string) => {
              if (!serverTypes) return;
              setServerType(
                serverTypes.find((type) => type.id === value)?.id ?? ""
              );
            }}
            placeholder="Select server type..."
          /> */}
        </div>
        {/* <button
          className="px-4 py-2 mt-auto bg-primary-100 text-dark-text rounded outline-none disabled:bg-disabled"
          onClick={() => {
            setCreateServerRunning(true);
            createServer.mutate(
              { name: serverName, type: serverType },
              {
                onSuccess: async () => {
                  setCreatingServer(false);
                  setCreateServerRunning(false);
                  refetch();
                },
                onError: (err) => {
                  setCreateServerRunning(false);
                  alert(err);
                },
              }
            );
          }}
          disabled={createServerRunning}
        >
          {createServerRunning ? (
            <PulseLoader size={10} color={"#333333"} />
          ) : (
            <p>Create</p>
          )}
        </button> */}
      </div>
    </div>
  );
}

function ServerList() {
  const [creatingServer, setCreatingServer] = useState(false);
  const navigate = useNavigate();

  const {
    data: servers,
    error,
    refetch,
  } = trpc.servers.useQuery(undefined, {
    retry: 1,
  });

  const { data: serverTypes } = trpc.serverTypes.useQuery();

  if (error && error.data?.code === "UNAUTHORIZED") {
    return <Navigate to="/login" />;
  }

  return (
    <div className="w-full h-full bg-neutral-100 text-primary-text">
      <div className="w-full bg-neutral-200 flex items-center">
        <p className="p-4 my-auto text-2xl">TSR Server Manager</p>
      </div>
      <div className="flex flex-col m-4 gap-4">
        {servers &&
          servers.map((node) => {
            return node.servers.map((server) => {
              let status = undefined;
              switch (server.status) {
                case undefined:
                  status = <Settings size={40} className="text-gray-500" />;
                  break;
                case "created":
                case "exited":
                  status = <StopCircle size={40} className="text-red-600" />;
                  break;
                case "running":
                  status = <PlayCircle size={40} className="text-success" />;
                  break;
                case "restarting":
                  status = (
                    <ArrowUpCircle size={40} className="text-gray-500" />
                  );
                  break;
                case "dead":
                  status = <AlertCircle size={40} className="text-red-600" />;
                  break;
              }
              return (
                <div
                  key={server.id}
                  className="w-full bg-neutral-200 flex flex-row hover:bg-neutral-300 transition-colors cursor-pointer p-4 rounded"
                  onClick={() => navigate(`/server/${server.id}/console`)}
                >
                  <div className="flex flex-col">
                    <p className="text-xl mb-2">{server.name}</p>
                    {serverTypes && (
                      <ServerTypeDisplay
                        type={server.type}
                        serverTypes={
                          serverTypes.find(
                            (entry) => entry.nodeId === node.nodeId
                          )?.serverTypes ?? []
                        }
                      />
                    )}
                  </div>

                  <div className="ml-auto flex items-center mr-2">
                    <div className="p-2 rounded">{status}</div>
                  </div>
                </div>
              );
            });
          })}
      </div>
      <div
        className="fixed bottom-0 right-0 m-8 transition-colors bg-neutral-200 flex flex-row items-center gap-2 hover:bg-neutral-300 p-2 rounded"
        onClick={() => setCreatingServer(true)}
      >
        <Plus className="text-primary-200" size={40} />
      </div>

      {creatingServer && serverTypes && (
        <CreateServerModal close={() => setCreatingServer(false)} />
      )}
    </div>
  );
}

export default ServerList;
