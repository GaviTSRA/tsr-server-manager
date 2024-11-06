import { useMutation, useQuery } from "react-query";
import { ServerStatus } from "../types";
import {
  AlertCircle,
  ArrowUpCircle,
  PlayCircle,
  Plus,
  Settings,
  StopCircle,
} from "react-feather";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dropdown } from "./components/Dropdown";

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

function ServerList() {
  const [creatingServer, setCreatingServer] = useState(false);
  const [serverName, setServerName] = useState("");
  const [serverType, setServerType] = useState("");
  const navigate = useNavigate();

  const { data: servers, refetch } = useQuery({
    queryKey: "servers",
    queryFn: () => fetch(API_BASE_URL).then((res) => res.json()),
  });

  const { data: serverTypes } = useQuery({
    queryKey: "serverTypes",
    queryFn: () =>
      fetch(`${API_BASE_URL}/servertypes`).then((res) => res.json()),
  });

  const createServer = useMutation({
    mutationFn: () => {
      return fetch(`${API_BASE_URL}/servers/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: serverName,
          type: serverType,
        }),
      });
    },
  });

  return (
    <div className="w-full h-full bg-background text-primary-text">
      <div className="w-full bg-header flex items-center">
        <p className="p-4 my-auto text-2xl">TSR Server Manager</p>
      </div>
      <div className="flex flex-col m-4 gap-4">
        {servers &&
          servers.map((server: ServerStatus) => {
            let status = undefined;
            switch (server.status) {
              case undefined:
                status = <Settings size={40} className="text-gray-500" />;
                break;
              case "created":
              case "exited":
                status = <StopCircle size={40} className="text-danger" />;
                break;
              case "running":
                status = <PlayCircle size={40} className="text-success" />;
                break;
              case "restarting":
                status = <ArrowUpCircle size={40} className="text-gray-500" />;
                break;
              case "dead":
                status = <AlertCircle size={40} className="text-danger" />;
                break;
            }
            return (
              <div
                key={server.id}
                className="w-full bg-header flex flex-row hover:bg-border transition-colors cursor-pointer p-4 rounded"
                onClick={() => navigate(`/${server.id}`)}
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
      </div>
      <div
        className="fixed bottom-0 right-0 m-8 transition-colors bg-header flex flex-row items-center gap-2 hover:bg-border p-2 rounded"
        onClick={() => setCreatingServer(true)}
      >
        <Plus className="text-green-600" size={40} />
      </div>
      {creatingServer && serverTypes && (
        <div
          className="fixed top-0 w-screen h-screen flex bg-black/75"
          onClick={() => setCreatingServer(false)}
        >
          <div
            className="bg-background p-4 m-auto rounded flex flex-col w-1/4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-2xl mb-4 text-center">Create New Server</p>
            <div className="mb-4">
              <p className="text-secondary-text">Name</p>
              <input
                className="rounded bg-header outline-none px-2 py-1 w-full"
                onChange={(event) => setServerName(event.target.value)}
              />
              <p className="text-secondary-text mt-2">Type</p>
              <Dropdown
                values={serverTypes.map((type) => type.name)}
                onSelect={(value: string) =>
                  setServerType(
                    serverTypes.find((type) => type.name === value).id
                  )
                }
                placeholder="Select server type..."
              />
            </div>
            <button
              className="px-4 py-2 mt-auto bg-success rounded outline-none"
              onClick={() => {
                createServer.mutate(null, {
                  onSuccess: async () => {
                    await refetch();
                    setCreatingServer(false);
                  },
                });
              }}
            >
              Create
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServerList;
