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
import { PulseLoader } from "react-spinners";
import { trpc } from "./main";

function ServerList() {
  const [creatingServer, setCreatingServer] = useState(false);
  const [createServerRunning, setCreateServerRunning] = useState(false);
  const [serverName, setServerName] = useState("");
  const [serverType, setServerType] = useState("");
  // const [serverCount, setServerCount] = useState(0);
  // const [servers, setServers] = useState([] as any[]);
  const navigate = useNavigate();

  const { data: servers, error, refetch } = trpc.servers.useQuery(undefined, {
    retry: 1,
  });
  // const fetchServers = async () => {
  //   const response = await fetch(API_BASE_URL);
  //   if (!response.ok || !response.body) {
  //     throw new Error("Network response was not ok");
  //   }
  //   return response.body.getReader();
  // };

  // const { data: serversStream } = useQuery("servers", fetchServers, {
  //   refetchOnWindowFocus: false,
  //   refetchInterval: () => 5000,
  //   refetchOnMount: false,
  // });

  // useEffect(() => {
  //   if (serversStream) {
  //     const decoder = new TextDecoder("utf-8");

  //     const readStream = async () => {
  //       while (true) {
  //         const { done, value } = await serversStream.read();
  //         if (done) break;

  //         const chunk = decoder.decode(value, { stream: true });
  //         if (chunk === "success") break;
  //         chunk
  //           .split("\n")
  //           .filter((el) => el !== "" && el !== undefined)
  //           .forEach((part) => {
  //             const data = JSON.parse(part);
  //             if (data.amount !== null && data.amount !== undefined) {
  //               setServerCount(data.amount);
  //               return;
  //             }
  //             setServers((prev) =>
  //               [...prev.filter((el) => el.id !== data.id), data].sort()
  //             );
  //           });
  //       }
  //     };
  //     readStream();
  //   }
  // }, [serversStream]);

  const { data: serverTypes } = trpc.serverTypes.useQuery();
  const createServer = trpc.createServer.useMutation();

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
          servers.map((server) => {
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
                status = <ArrowUpCircle size={40} className="text-gray-500" />;
                break;
              case "dead":
                status = <AlertCircle size={40} className="text-red-600" />;
                break;
            }
            return (
              <div
                key={server.id}
                className="w-full bg-neutral-200 flex flex-row hover:bg-neutral-300 transition-colors cursor-pointer p-4 rounded"
                onClick={() => navigate(`/server/${server.id}/Console`)}
              >
                <div className="flex flex-col">
                  <p className="text-xl">{server.name}</p>
                  <p className="text-secondary-text text-sm">
                    {server.id.slice(0, 18)}
                  </p>
                  {server.containerId && (
                    <p className="text-secondary-text text-sm">
                      {server.containerId.slice(0, 18)}
                    </p>
                  )}
                </div>
                <div className="ml-auto flex items-center mr-2">
                  <div className="p-2 rounded">{status}</div>
                </div>
              </div>
            );
          })}
        {/* {[...Array(serverCount - servers.length)].map((index) => {
          return (
            <div
              key={index}
              className="w-full bg-neutral-200 flex flex-row hover:bg-neutral-300 transition-colors cursor-pointer p-4 rounded"
            >
              <div className="flex flex-col">
                {/* <p className="text-xl">{server.name}</p> */}
        {/* <p className="text-secondary-text text-sm">
                    {server.id.slice(0, 18)}
                  </p>
                  {server.containerId && (
                    <p className="text-secondary-text text-sm">
                      {server.containerId.slice(0, 18)}
                    </p>
                  )} }
              </div>
              <div className="ml-auto flex items-center mr-2">
                <div className="p-2 rounded">
                  <MoonLoader size={30} color={"#CCCCCC"} />
                </div>
              </div>
            </div>
          );
        })} */}
      </div>
      <div
        className="fixed bottom-0 right-0 m-8 transition-colors bg-neutral-200 flex flex-row items-center gap-2 hover:bg-neutral-300 p-2 rounded"
        onClick={() => setCreatingServer(true)}
      >
        <Plus className="text-primary-200" size={40} />
      </div>
      {creatingServer && serverTypes && (
        <div
          className="fixed top-0 w-screen h-screen flex bg-black/75"
          onClick={() => setCreatingServer(false)}
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
              <Dropdown
                color="bg-neutral-300 hover:bg-neutral-400"
                values={serverTypes.map((type) => type.name)}
                onSelect={(value: string) => {
                  if (!serverTypes) return;
                  setServerType(
                    serverTypes.find((type) => type.name === value)?.id ?? ""
                  );
                }}
                placeholder="Select server type..."
              />
            </div>
            <button
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
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServerList;
