import {
  AlertTriangle,
  CheckCircle,
  Edit2,
  Key,
  Link,
  RefreshCw,
  Server,
  Settings,
  WifiOff,
} from "react-feather";
import { trpc } from "../main";
import { useState } from "react";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@tsm/server";
import Modal, { useModal } from "./Modal";

type NodeType = inferProcedureOutput<AppRouter["node"]["list"]>["0"];

export function Node({ node }: { node: NodeType }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const modal = useModal();

  const editNode = trpc.node.edit.useMutation();

  const moreOptions = [
    {
      label: "Rename",
      icon: <Edit2 />,
      onClick: () =>
        modal.open(
          "Rename node",
          `Rename node '${node.name}'`,
          true,
          (input) => {
            if (!input) return;
            modal.fetching();
            editNode.mutate(
              { nodeId: node.id, name: input },
              {
                onError: () => {
                  modal.error();
                  setTimeout(() => modal.close(), 2000);
                },
                onSuccess: () => {
                  modal.success();
                  setTimeout(() => modal.close(), 2000);
                },
              }
            );
          },
          () => {
            modal.close();
          }
        ),
    },
    {
      label: "Edit URL",
      icon: <Link />,
      onClick: () =>
        modal.open(
          "Edit node url",
          `Edit url of node '${node.name}'`,
          true,
          (input) => {
            if (!input) return;
            modal.fetching();
            editNode.mutate(
              { nodeId: node.id, url: input },
              {
                onError: () => {
                  modal.error();
                  setTimeout(() => modal.close(), 2000);
                },
                onSuccess: () => {
                  modal.success();
                  setTimeout(() => modal.close(), 2000);
                },
              }
            );
          },
          () => {
            modal.close();
          }
        ),
    },
    {
      label: "Edit Password",
      icon: <Key />,
      onClick: () =>
        modal.open(
          "Edit node password",
          `Edit password of node '${node.name}'`,
          true,
          (input) => {
            if (!input) return;
            modal.fetching();
            editNode.mutate(
              { nodeId: node.id, password: input },
              {
                onError: () => {
                  modal.error();
                  setTimeout(() => modal.close(), 2000);
                },
                onSuccess: () => {
                  modal.success();
                  setTimeout(() => modal.close(), 2000);
                },
              }
            );
          },
          () => {
            modal.close();
          }
        ),
    },
  ];

  return (
    <div className="bg-neutral-200 w-fit px-4 py-2 rounded">
      <Modal data={modal.data} />
      <div className="flex flex-row gap-2 items-center">
        <Server />
        <p className="text-xl">{node.name}</p>
        <button
          className="ml-auto text-secondary-text p-0 m-0"
          onClick={(e) => {
            e.stopPropagation();
            setMoreOpen(true);
          }}
        >
          <Settings />
          {moreOpen && (
            <div className="absolute w-fit shadow-lg text-white">
              <div
                className="fixed top-0 left-0 w-full h-full z-[50]"
                onClick={(e) => {
                  e.stopPropagation();
                  setMoreOpen(false);
                }}
              ></div>
              <div>
                {moreOptions.map((value, index) => (
                  <div
                    className={`relative w-full z-[60] cursor-pointer bg-neutral-300 hover:bg-neutral-400 p-2 first:rounded-t last:rounded-b flex flex-row items-center gap-2`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreOpen(false);
                      value.onClick();
                    }}
                    key={index}
                  >
                    {value.icon}
                    <p>{value.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </button>
      </div>
      <p className="text-sm text-secondary-text mt-1 mb-2">{node.id}</p>
      <p className="mb-2">{node.url}</p>
      {node.state === "CONNECTED" && (
        <div className="flex flex-row gap-2 items-center text-success">
          <CheckCircle />
          <p>Connected</p>
        </div>
      )}
      {node.state === "SYNC_ERROR" && (
        <div className="flex flex-row gap-2 items-center text-danger">
          <RefreshCw />
          <p>Sync Error</p>
        </div>
      )}
      {node.state === "AUTHENTICATION_ERROR" && (
        <div className="flex flex-row gap-2 items-center text-danger">
          <AlertTriangle />
          <p>Authentication Error</p>
        </div>
      )}
      {node.state === "CONNECTION_ERROR" && (
        <div className="flex flex-row gap-2 items-center text-danger">
          <WifiOff />
          <p>Connection Error</p>
        </div>
      )}
    </div>
  );
}

export default function NodeList() {
  const { data: nodes } = trpc.node.list.useQuery(
    { connected: false },
    { refetchInterval: 5000 }
  );

  return (
    <div>
      <div className="flex flex-row m-4 gap-4">
        {nodes && nodes.map((node) => <Node key={node.id} node={node} />)}
      </div>
    </div>
  );
}
