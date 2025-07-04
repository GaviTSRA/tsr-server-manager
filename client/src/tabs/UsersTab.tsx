import { MoonLoader } from "react-spinners";
import { trpc } from "../main";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Save,
  Shield,
  Trash2,
  User,
} from "react-feather";
import { Container } from "../components/Container";
import { useEffect, useState } from "react";
import { Toggle } from "../components/Toggle";
import { Dropdown } from "../components/Dropdown";
import { useModal } from "../components/Modal";
import { useServerQueryParams } from "../useServerQueryParams";
import { Permission } from "@tsm/server";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../components/Button";
import { Error } from "../components/Error";

export function UserSettings({
  user,
  ownPermissions,
  refetch,
  isOwner,
  allPermissions,
}: {
  user: {
    id: string;
    name: string;
    owner: boolean;
    permissions: string[];
  };
  ownPermissions: string[];
  isOwner: boolean;
  refetch: () => void;
  allPermissions: Permission[];
}) {
  const { nodeId, serverId } = useServerQueryParams();
  const [expanded, setExpanded] = useState(false);
  const [addPermissions, setAddPermissions] = useState([] as string[]);
  const [removePermissions, setRemovePermissions] = useState([] as string[]);

  const writePermission = trpc.server.users.writePermissions.useMutation();
  const deleteUser = trpc.server.users.deleteUser.useMutation();

  const deleteUserModal = useModal([
    {
      title: "Remove user?",
      description: `Confirm removal of user '${user.name}'`,
      onConfirm: () => {
        deleteUserModal.fetching();
        deleteUser.mutate(
          { deleteUserId: user.id, serverId, nodeId },
          {
            onSuccess: () => {
              deleteUserModal.success();
              refetch();
            },
            onError: () => deleteUserModal.error(),
          }
        );
      },
    },
  ]);

  return (
    <Container className="flex flex-col p-2 rounded-sm h-fit">
      {deleteUserModal.Modal}
      <div
        className="flex flex-row text-2xl items-center gap-2"
        onClick={() => setExpanded(!expanded)}
      >
        {user.owner && <Shield />}
        {!user.owner && <User />}
        {user.name}
        <div className="ml-auto flex flex-row items-center">
          {writePermission.isPending && <MoonLoader size={20} color="white" />}
          {writePermission.isSuccess && (
            <Check size={20} color={"green"} strokeWidth={4} />
          )}
          {expanded && <ChevronUp />}
          {!expanded && <ChevronDown />}
        </div>
      </div>
      <div>
        {writePermission.error && (
          <Error error={writePermission.error} size="small" />
        )}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="flex flex-col gap-2 mt-2 overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {allPermissions.map((permission) => (
              <div
                className="flex flex-row items-center gap-2"
                key={permission.id}
              >
                <div>
                  <Toggle
                    disabled={
                      user.owner ||
                      (!ownPermissions.includes(permission.id) && !isOwner)
                    }
                    defaultValue={
                      user.permissions.includes(permission.id) || user.owner
                    }
                    onChange={(value) => {
                      if (value) {
                        setAddPermissions((prev) => [...prev, permission.id]);
                        setRemovePermissions((prev) => [
                          ...prev.filter((el) => el !== permission.id),
                        ]);
                      } else {
                        setAddPermissions((prev) => [
                          ...prev.filter((el) => el !== permission.id),
                        ]);
                        setRemovePermissions((prev) => [
                          ...prev,
                          permission.id,
                        ]);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col leading-none">
                  <div className="flex flex-row items-center gap-2">
                    <p className="text-lg">{permission.name}</p>
                    <p className="text-secondary-text text-sm">
                      {permission.id}
                    </p>
                  </div>
                  <p className="text-secondary-text">
                    {permission.description}
                  </p>
                </div>
              </div>
            ))}
            {!user.owner && (
              <div className="flex flex-row items-center mt-2">
                <Button
                  variant="danger"
                  onClick={() => {
                    deleteUserModal.open();
                  }}
                  icon={<Trash2 />}
                  query={deleteUser}
                >
                  <p>Remove</p>
                </Button>
                <Button
                  className="ml-auto"
                  onClick={() => {
                    writePermission.mutate({
                      editUserId: user.id,
                      nodeId,
                      serverId,
                      addPermissions,
                      removePermissions,
                    });
                  }}
                  variant="confirm"
                  icon={<Save />}
                  query={writePermission}
                >
                  <p>Save</p>
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
  );
}

export function UsersTab() {
  const { nodeId, serverId } = useServerQueryParams();
  const {
    data: users,
    error,
    refetch: refetchUsers,
  } = trpc.server.users.read.useQuery({ serverId, nodeId });
  const {
    data: allUsers,
    error: usersError,
    refetch: refetchAllUsers,
  } = trpc.user.list.useQuery();
  const { data: allPermissions, error: permissionsError } =
    trpc.server.users.permissions.useQuery({
      serverId,
      nodeId,
    });

  const [ownPermissions, setOwnPermissions] = useState([] as string[]);
  const [isOwner, setIsOwner] = useState(false);
  const [newUser, setNewUser] = useState(null as string | null);

  const addUser = trpc.server.users.addUser.useMutation();

  useEffect(() => {
    if (!users) return;
    const self = users.find((user) => user.self);
    if (!self) return;
    setIsOwner(self.owner);
    setOwnPermissions(self.permissions);
  }, [users]);

  function refetch() {
    refetchUsers();
    refetchAllUsers();
  }

  if (error) {
    return <Error error={error} />;
  }

  if (permissionsError) {
    return <Error error={permissionsError} />;
  }

  if (!users || !allPermissions) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
      {users.map((user) => (
        <UserSettings
          user={user}
          ownPermissions={ownPermissions}
          isOwner={isOwner}
          key={user.id}
          refetch={refetch}
          allPermissions={allPermissions}
        />
      ))}
      <Container className="h-fit">
        <div className="w-full flex items-center justify-center">
          {!allUsers && !usersError && (
            <MoonLoader size={40} color={"#FFFFFF"} />
          )}
          {usersError && <Error error={usersError} />}
          {allUsers && (
            <div className="w-full flex flex-col">
              <Dropdown
                values={allUsers
                  .filter(
                    (user) =>
                      !users.map((user) => user.name).includes(user.name)
                  )
                  .map((user) => user.name)}
                placeholder="Select user to add..."
                onSelect={(value) => {
                  const user = allUsers.find((el) => el.name === value);
                  if (!user) return;
                  setNewUser(user.id);
                }}
              />
              <div className="flex flex-row items-center">
                <Button
                  className="mt-2"
                  disabled={newUser === null}
                  onClick={() => {
                    if (!newUser) return;
                    addUser.mutate(
                      { serverId, newUserId: newUser, nodeId },
                      {
                        onSuccess: () => refetch(),
                      }
                    );
                  }}
                  icon={<Plus />}
                  query={addUser}
                >
                  <p>Add User</p>
                </Button>
                <div className="ml-auto flex items-center flex-row h-full"></div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
}
