import { useState } from "react";
import { trpc } from "../main";
import { Container } from "../components/Container";
import { Edit2, Folder, Trash2, File, MoreVertical } from "react-feather";
import { Input } from "../components/Input";
import { MoonLoader } from "react-spinners";
import { Error } from "../components/Error";

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
  const [deleteConfirmationMenuOpen, setDeleteConfirmationMenuOpen] =
    useState(false);
  const [renameMenuOpen, setRenameMenuOpen] = useState(false);
  const [newName, setNewName] = useState(undefined as string | undefined);

  const renameFile = trpc.server.files.rename.useMutation();
  const deleteFile = trpc.server.files.delete.useMutation();

  const moreOptions = [
    {
      label: "Rename",
      icon: <Edit2 />,
      onClick: () => setRenameMenuOpen(true),
    },
    {
      label: "Delete",
      icon: <Trash2 />,
      onClick: () => setDeleteConfirmationMenuOpen(true),
    },
  ];

  return (
    <div
      className="flex flex-row gap-2 hover:bg-neutral-300 p-2 rounded cursor-pointer"
      onClick={() => {
        setPath(path + file.name + (file.type === "folder" ? "/" : ""));
      }}
    >
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
      </div>
      {renameMenuOpen && (
        <div
          className="fixed w-screen h-screen bg-black/40 top-0 left-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-neutral-200 m-auto w-fit h-fit p-2 rounded-xl">
            <p>Rename '{file.name}'</p>
            <Input onValueChange={(value) => setNewName(value)} />
            <div className="flex flex-row mt-2">
              <button onClick={() => setRenameMenuOpen(false)}>Cancel</button>
              <button
                onClick={() => {
                  if (!newName) return;
                  renameFile.mutate(
                    { name: newName, path, serverId },
                    {
                      onSuccess: () => {
                        setRenameMenuOpen(false);
                        refetch();
                      },
                    }
                  );
                }}
                className="ml-auto"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmationMenuOpen && (
        <div className="fixed w-screen h-screen bg-black/40 top-0 left-0">
          <div className="bg-neutral-200 m-auto w-fit h-fit p-2 rounded-xl">
            <p>Confirm deletion of '{file.name}'</p>
            <div className="flex flex-row mt-2">
              <button onClick={() => setDeleteConfirmationMenuOpen(false)}>
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteFile.mutate(
                    { path, serverId },
                    {
                      onSuccess: () => {
                        setDeleteConfirmationMenuOpen(false);
                        refetch();
                      },
                    }
                  );
                }}
                className="ml-auto"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FilesTab({ serverId }: { serverId: string }) {
  const [path, setPath] = useState("/");
  const [content, setContent] = useState(undefined as string | undefined);

  const { data: files, refetch, error } = trpc.server.files.list.useQuery(
    { path, serverId: serverId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  );
  const editFile = trpc.server.files.edit.useMutation();

  if (error) {
    return <Error error={error} />
  }

  if (!files) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  if (files.type === "file" && !content) setContent(files.content);
  if (files.type === "folder" && content) setContent(undefined);

  return (
    <div className="h-full flex flex-col">
      <Container className="flex flex-row p-2 mb-2">
        <div className="flex flex-row items-center">
          <p
            className="p-1 rounded cursor-pointer hover:bg-neutral-300"
            onClick={() => {
              setPath("/");
              refetch();
            }}
          >
            container
          </p>
          <p>/</p>
        </div>
        <div className="flex flex-row">
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
                <p className="p-1 rounded cursor-pointer hover:bg-neutral-300">
                  {part}
                </p>
                <p>/</p>
              </div>
            ))}
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
      {files.type === "file" && files.content && (
        <Container className="h-full">
          <textarea
            value={content}
            className="w-full h-full overflow-auto p-4 relative rounded bg-neutral-300"
            onChange={(event) => setContent(event.target.value)}
          />
          <button
            className="bg-success text-black px-2 py-1 text-2xl rounded"
            onClick={() => {
              if (content) {
                editFile.mutate({ content, path, serverId });
              }
            }}
          >
            Save
          </button>
        </Container>
      )}
    </div>
  );
}
