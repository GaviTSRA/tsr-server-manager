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
import { useModal } from "../components/Modal";
import { Input } from "../components/Input";
import { useServerQueryParams } from "../Server";

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
  file,
  path,
  setPath,
  refetch,
}: {
  path: string;
  setPath: (newPath: string) => void;
  file: {
    name: string;
    type: "file" | "folder";
    size: number;
    lastEdited: Date;
  };
  refetch: () => void;
}): JSX.Element {
  const { nodeId, serverId } = useServerQueryParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const [renameInput, setRenameInput] = useState("");

  const renameFile = trpc.server.files.rename.useMutation();
  const deleteFile = trpc.server.files.delete.useMutation();

  const renameModal = useModal([
    {
      title: "Rename file",
      description: `Rename file '${file.name}'`,
      body: (
        <Input
          onValueChange={(value) => setRenameInput(value)}
          className="rounded"
        />
      ),
      onConfirm: () => {
        if (!renameInput) return;
        renameModal.fetching();
        renameFile.mutate(
          { path: path + file.name, name: renameInput, serverId, nodeId },
          {
            onError: () => {
              renameModal.error();
            },
            onSuccess: () => {
              renameModal.success();
              refetch();
            },
          }
        );
      },
    },
  ]);

  const deleteModal = useModal([
    {
      title: "Delete file",
      description: `Delete file '${file.name}'`,
      onConfirm: () => {
        deleteModal.fetching();
        deleteFile.mutate(
          { path: path + file.name, serverId, nodeId },
          {
            onError: () => {
              deleteModal.error();
            },
            onSuccess: () => {
              deleteModal.success();
              refetch();
            },
          }
        );
      },
    },
  ]);

  const moreOptions = [
    {
      label: "Rename",
      icon: <Edit2 />,
      onClick: renameModal.open,
    },
    {
      label: "Delete",
      icon: <Trash2 />,
      onClick: deleteModal.open,
    },
  ];

  return (
    <div
      className="flex flex-row gap-2 hover:bg-neutral-150 p-2 rounded cursor-pointer"
      onClick={() => {
        setPath(path + file.name + (file.type === "folder" ? "/" : ""));
      }}
    >
      {renameModal.Modal}
      {deleteModal.Modal}
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
    </div>
  );
}

export function FilesTab() {
  const { nodeId, serverId } = useServerQueryParams();
  const [path, setPath] = useState("/");
  const [content, setContent] = useState(undefined as string | undefined);
  // const [file, setFile] = useState<File | null>(null);
  const [createFileInput, setCreateFileInput] = useState("");
  const [createFolderInput, setCreateFolderInput] = useState("");

  const {
    data: files,
    refetch,
    error,
  } = trpc.server.files.list.useQuery(
    { path, serverId, nodeId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  );

  const createFileModal = useModal([
    {
      title: "Create file",
      description: "Enter the name of the new file",
      body: (
        <Input
          onValueChange={(value) => setCreateFileInput(value)}
          className="rounded"
        />
      ),
      onConfirm: () => {
        if (!createFileInput) return;
        createFileModal.fetching();
        createFile.mutate(
          {
            path: path.endsWith("/")
              ? path + createFileInput
              : path + "/" + createFileInput,
            serverId,
            nodeId,
          },
          {
            onError: () => {
              createFileModal.error();
            },
            onSuccess: () => {
              createFileModal.success();
              setTimeout(() => createFileModal.close(), 2000);
              refetch();
            },
          }
        );
      },
    },
  ]);
  const createFolderModal = useModal([
    {
      title: "Create folder",
      description: "Enter the name of the new folder",
      body: (
        <Input
          onValueChange={(value) => setCreateFolderInput(value)}
          className="rounded"
        />
      ),
      onConfirm: () => {
        if (!createFolderInput) return;
        createFolderModal.fetching();
        createFolder.mutate(
          {
            path: path.endsWith("/")
              ? path + createFolderInput
              : path + "/" + createFolderInput,
            serverId,
            nodeId,
          },
          {
            onError: () => {
              createFolderModal.error();
            },
            onSuccess: () => {
              createFolderModal.success();
              setTimeout(() => createFolderModal.close(), 2000);
              refetch();
            },
          }
        );
      },
    },
  ]);

  const editFile = trpc.server.files.edit.useMutation();
  const createFile = trpc.server.files.create.useMutation();
  const createFolder = trpc.server.files.createFolder.useMutation();
  // const uploadFile = trpc.server.files.upload.useMutation();

  // const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   if (e.target.files) {
  //     setFile(e.target.files[0]);
  //   }
  // };

  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();

  //   if (!file) {
  //     alert("Please select a file");
  //     return;
  //   }

  //   const formData = new FormData();
  //   formData.append("path", path);
  //   formData.append("serverId", serverId);
  //   formData.append("file", file);

  //   await uploadFile.mutateAsync(
  //     { ...formData, nodeId },
  //     {
  //       onSuccess: () => {
  //         refetch();
  //         alert("done");
  //       },
  //     }
  //   );
  // };

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
      {createFileModal.Modal}
      {createFolderModal.Modal}
      <Container className="flex flex-row p-2 mb-2">
        <div className="flex flex-row items-center">
          <p
            className="py-1 rounded cursor-pointer text-secondary-text hover:bg-neutral-150"
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
                <p className="py-1 rounded cursor-pointer hover:bg-neutral-150">
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
                  editFile.mutate({ content, path, serverId, nodeId });
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
                onClick={createFileModal.open}
              >
                Create File
              </button>
              <button
                className="bg-neutral-300 hover:bg-neutral-400 active:bg-neutral-500 px-2 py-1 rounded"
                onClick={createFolderModal.open}
              >
                Create Folder
              </button>
              {/* <form onSubmit={handleSubmit}>
                <input type="file" onChange={handleFileChange} />
                <button type="submit">Upload File</button>
              </form> */}
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
            className="w-full h-full overflow-auto p-4 relative rounded bg-neutral-150 resize-none outline-none"
            onChange={(event) => setContent(event.target.value)}
          />
        </Container>
      )}
    </div>
  );
}
