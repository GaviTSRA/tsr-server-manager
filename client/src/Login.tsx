import { Key, User, LogIn, UserPlus } from "react-feather";
import { Input } from "./components/Input";
import { useState } from "react";
import { trpc } from "./main";
import { useNavigate } from "react-router-dom";
import { BarLoader } from "react-spinners";

export function Login(): JSX.Element {
  const [username, setUsername] = useState(null as string | null);
  const [password, setPassword] = useState(null as string | null);
  const [registering, setRegistering] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const register = trpc.user.register.useMutation();
  const login = trpc.user.login.useMutation();

  const navigate = useNavigate();

  return (
    <div className="w-full h-full flex items-center bg-neutral-100 text-white">
      <div className="w-2/3 md:w-2/4 lg:w-1/4 m-auto bg-neutral-200 rounded-2xl p-4">
        <div className="flex flex-col">
          <div className="flex flex-row items-center pr-2 py-2 gap-2">
            <User />
            <p>Username</p>
          </div>
          <Input className="rounded-sm" onValueChange={setUsername} />
        </div>
        <div className="flex flex-col">
          <div className="flex flex-row items-center pr-2 py-2 gap-2 mt-4">
            <Key />
            <p>Password</p>
          </div>
          <Input
            className="rounded-sm"
            onValueChange={setPassword}
            type="password"
          />
        </div>
        <div className="w-full flex flex-col sm:flex-row items-center justify-center mt-8 gap-2 sm:gap-8">
          <button
            disabled={!username || !password || loggingIn || registering}
            className="h-10 bg-neutral-400 hover:bg-neutral-500 disabled:bg-neutral-300 p-2 flex flex-row items-center rounded-sm px-4 py-2 text-white gap-2"
            onClick={() => {
              if (!username || !password) {
                return;
              }
              setRegistering(true);
              register.mutate(
                { name: username, password },
                {
                  onSuccess: () => {
                    setLoggingIn(true);
                    login.mutate(
                      { name: username, password },
                      {
                        onSettled: () => {
                          setLoggingIn(false);
                        },
                        onSuccess: (token) => {
                          localStorage.setItem("authToken", token);
                          navigate("/");
                        },
                        onError: (error) => {
                          alert(error);
                        },
                      }
                    );
                  },
                  onSettled: () => {
                    setRegistering(false);
                  },
                  onError: (error) => {
                    alert(error);
                  },
                }
              );
            }}
          >
            {registering ? (
              <BarLoader />
            ) : (
              <div className="flex flex-row items-center gap-2">
                <UserPlus />
                <p>Register</p>
              </div>
            )}
          </button>
          <button
            disabled={!username || !password || loggingIn || registering}
            className="h-10 bg-neutral-400 hover:bg-neutral-500 disabled:bg-neutral-300 p-2 flex flex-row items-center rounded-sm px-4 py-2 text-white gap-2"
            onClick={() => {
              if (!username || !password) {
                return;
              }
              setLoggingIn(true);
              login.mutate(
                { name: username, password },
                {
                  onSettled: () => {
                    setLoggingIn(false);
                  },
                  onSuccess: (token) => {
                    localStorage.setItem("authToken", token);
                    navigate("/");
                  },
                  onError: (error) => {
                    alert(error);
                  },
                }
              );
            }}
          >
            {loggingIn ? (
              <BarLoader />
            ) : (
              <div className="flex flex-row items-center gap-2">
                <LogIn />
                <p>Login</p>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
