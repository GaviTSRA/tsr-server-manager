import { useState } from "react";
import { trpc } from "../main";
import { Container } from "../components/Container";
import {
  Edit2,
  Folder,
  Trash2,
  File,
  MoreVertical,
  Save,
  Check,
} from "react-feather";
import { MoonLoader } from "react-spinners";
import { Error } from "../components/Error";
import Modal, { useModal } from "../components/Modal";

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} Bytes`;
  }
  if (size < 1024 * 1000) {
    return `${(size / 1024).toFixed(2)} KB`;
  }
  if (size < 1024 * 1024 * 1000) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }
  if (size < 1024 * 1024 * 1024 * 1000) {
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }
  return "Too large";
}

function FileRow({
  serverId,
  file,
  path,
  setPath,
  refetch,
}: {
  serverId: string;
  path: string;
  setPath: (newPath: string) => void;
  file: {
    name: string;
    type: "file" | "folder";
    size: number;
    lastEdited: string;
  };
  refetch: () => void;
}): JSX.Element {
  const [moreOpen, setMoreOpen] = useState(false);

  const renameFile = trpc.server.files.rename.useMutation();
  const deleteFile = trpc.server.files.delete.useMutation();

  const modal = useModal();

  const moreOptions = [
    {
      label: "Rename",
      icon: <Edit2 />,
      onClick: (fileName: string) =>
        modal.open(
          "Rename file",
          `Rename file '${fileName}'`,
          true,
          (input) => {
            if (!input) return;
            modal.fetching();
            renameFile.mutate(
              { path: path + file.name, name: input, serverId },
              {
                onError: () => {
                  modal.error();
                  setTimeout(() => modal.close(), 2000);
                },
                onSuccess: () => {
                  modal.success();
                  setTimeout(() => modal.close(), 2000);
                  refetch();
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
      label: "Delete",
      icon: <Trash2 />,
      onClick: (fileName: string) =>
        modal.open(
          "Delete file?",
          `Confirm deletion of '${fileName}'`,
          false,
          (_) => {
            modal.fetching();
            deleteFile.mutate(
              { path: path + file.name, serverId },
              {
                onError: () => {
                  modal.error();
                  setTimeout(() => modal.close(), 2000);
                },
                onSuccess: () => {
                  modal.success();
                  setTimeout(() => modal.close(), 2000);
                  refetch();
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
    <div
      className="flex flex-row gap-2 hover:bg-neutral-100 p-2 rounded cursor-pointer"
      onClick={() => {
        setPath(path + file.name + (file.type === "folder" ? "/" : ""));
      }}
    >
      <Modal data={modal.data} />
      {file.type === "folder" && <Folder />}
      {file.type === "file" && <File />}
      <p>{file.name}</p>
      <div className="ml-auto flex relative flex-row items-center gap-2">
        {file.type === "file" && <p>{formatFileSize(file.size)}</p>}
        <p>
          {new Date(file.lastEdited).toLocaleDateString("de-DE", {
            year: "numeric",
            month: "2-digit",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </p>
        <MoreVertical
          onClick={(e) => {
            e.stopPropagation();
            setMoreOpen(true);
          }}
        />
        {moreOpen && (
          <div className="absolute w-full shadow-lg">
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
                    value.onClick(file.name);
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
      </div>
    </div>
  );
}

export function FilesTab({ serverId }: { serverId: string }) {
  const [path, setPath] = useState("/");
  const [content, setContent] = useState(undefined as string | undefined);

  const {
    data: files,
    refetch,
    error,
  } = trpc.server.files.list.useQuery(
    { path, serverId: serverId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  );

  const modal = useModal();

  const editFile = trpc.server.files.edit.useMutation();
  const createFile = trpc.server.files.create.useMutation();
  const createDir = trpc.server.files.createFolder.useMutation();

  if (error) {
    return <Error error={error} />;
  }

  if (!files) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  if (files.type === "file" && content === undefined) setContent(files.content);
  if (files.type === "folder" && content) setContent(undefined);

  return (
    <div className="h-full flex flex-col">
      <Container className="flex flex-row p-2 mb-2">
        <Modal data={modal.data} />
        <div className="flex flex-row items-center">
          <p
            className="py-1 rounded cursor-pointer text-secondary-text hover:bg-neutral-100"
            onClick={() => {
              setPath("/");
              refetch();
            }}
          >
            container/
          </p>
        </div>
        <div className="flex flex-row w-full">
          {path
            .split("/")
            .filter((part) => part !== "")
            .map((part, index) => (
              <div
                className="flex flex-row items-center"
                key={index}
                onClick={() => {
                  setPath(
                    "/" +
                      path
                        .split("/")
                        .filter((part) => part !== "")
                        .slice(0, index + 1)
                        .join("/") +
                      "/"
                  );
                  refetch();
                }}
              >
                <p className="py-1 rounded cursor-pointer hover:bg-neutral-100">
                  {part}
                </p>
                {(files.type === "folder" ||
                  path.split("/").filter((part) => part !== "").length !==
                    index + 1) && <p>/</p>}
              </div>
            ))}
          {files.type === "file" && (
            <button
              className="flex items-center bg-confirm-normal hover:bg-confirm-hover active:bg-confirm-active disabled:bg-confirm-disabled px-2 py-1 text-2xl rounded ml-auto"
              onClick={() => {
                if (content) {
                  editFile.mutate({ content, path, serverId });
                }
              }}
              disabled={editFile.isPending}
            >
              {!editFile.isError &&
                !editFile.isSuccess &&
                !editFile.isPending && <Save size={16} color="white" />}
              {editFile.isPending && <MoonLoader size={18} color={"white"} />}
              {editFile.isSuccess && (
                <Check size={22} className="text-success" />
              )}
              {editFile.error && <Error error={editFile.error} size="small" />}
            </button>
          )}
          {files.type === "folder" && (
            <div className="flex flex-row ml-auto mr-4 gap-4">
              <button
                className="bg-neutral-300 hover:bg-neutral-400 active:bg-neutral-500 px-2 py-1 rounded"
                onClick={() => {
                  modal.open(
                    "Create file",
                    "Enter the name of the new file",
                    true,
                    (input) => {
                      if (!input) return;
                      modal.fetching();
                      createFile.mutate(
                        {
                          path: path.endsWith("/")
                            ? path + input
                            : path + "/" + input,
                          serverId,
                        },
                        {
                          onError: () => {
                            modal.error();
                            setTimeout(() => modal.close(), 2000);
                          },
                          onSuccess: () => {
                            modal.success();
                            setTimeout(() => modal.close(), 2000);
                            refetch();
                          },
                        }
                      );
                    },
                    () => {
                      modal.close();
                    }
                  );
                }}
              >
                Create File
              </button>
              <button
                className="bg-neutral-300 hover:bg-neutral-400 active:bg-neutral-500 px-2 py-1 rounded"
                onClick={() => {
                  modal.open(
                    "Create folder",
                    "Enter the name of the new folder",
                    true,
                    (input) => {
                      if (!input) return;
                      modal.fetching();
                      createDir.mutate(
                        {
                          path: path.endsWith("/")
                            ? path + input
                            : path + "/" + input,
                          serverId,
                        },
                        {
                          onError: () => {
                            modal.error();
                            setTimeout(() => modal.close(), 2000);
                          },
                          onSuccess: () => {
                            modal.success();
                            setTimeout(() => modal.close(), 2000);
                            refetch();
                          },
                        }
                      );
                    },
                    () => {
                      modal.close();
                    }
                  );
                }}
              >
                Create Folder
              </button>
            </div>
          )}
        </div>
      </Container>
      {files.type === "folder" && files.files && (
        <Container className="flex flex-col">
          {files.files
            .sort((a, b) =>
              a.type === "folder" ? -1 : b.type === "folder" ? 1 : 0
            )
            .map((file) => (
              <FileRow
                file={file}
                path={path}
                setPath={setPath}
                serverId={serverId}
                key={file.name + file.size}
                refetch={refetch}
              />
            ))}
        </Container>
      )}
      {files.type === "file" && files.content !== undefined && (
        <Container className="h-full" expanded={true}>
          <textarea
            value={content}
            className="w-full h-full overflow-auto p-4 relative rounded bg-neutral-100 resize-none outline-none"
            onChange={(event) => setContent(event.target.value)}
          />
        </Container>
      )}
    </div>
  );
}
