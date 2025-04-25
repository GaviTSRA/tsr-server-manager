import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import MainPage from "./MainPage";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Server } from "./Server";
import type { AppRouter } from "@tsm/server";
import {
  createTRPCReact,
  httpBatchLink,
  httpLink,
  isNonJsonSerializable,
  splitLink,
} from "@trpc/react-query";
import { inferRouterOutputs } from "@trpc/server";
import { unstable_httpSubscriptionLink } from "@trpc/react-query";
import { Login } from "./Login";
import ServerList from "./components/ServerList";
import NodeList from "./components/NodeList";
import ErrorPage from "./components/ErrorPage";
import SuperJSON from "superjson";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL;
const router = createBrowserRouter([
  {
    path: "/",
    element: <MainPage />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <ServerList />,
      },
      {
        path: "/nodes",
        element: <NodeList />,
      },
    ],
  },
  {
    path: "/server/:nodeId/:serverId/:tab",
    element: <Server />,
  },
  {
    path: "/login",
    element: <Login />,
  },
]);

export const trpc = createTRPCReact<AppRouter>();
type RouterOutputs = inferRouterOutputs<AppRouter>;
export type Server = RouterOutputs["server"]["server"];
export type ServerStatus = RouterOutputs["server"]["status"];

const trpcClient = trpc.createClient({
  links: [
    splitLink({
      // uses the httpSubscriptionLink for subscriptions
      condition: (op) => op.type === "subscription",
      true: unstable_httpSubscriptionLink({
        transformer: SuperJSON,
        url: API_BASE_URL,
        connectionParams: () => {
          const token = localStorage.getItem("authToken");
          return { token: token ?? undefined };
        },
      }),
      false: splitLink({
        condition: (op) => isNonJsonSerializable(op.input),
        true: httpLink({
          transformer: SuperJSON,
          url: API_BASE_URL,
          headers: () => {
            const token = localStorage.getItem("authToken");
            return {
              Authorization: token ? `Bearer ${token}` : undefined,
            };
          },
        }),
        false: httpBatchLink({
          url: API_BASE_URL,
          transformer: SuperJSON,
          headers: () => {
            const token = localStorage.getItem("authToken");
            return {
              Authorization: token ? `Bearer ${token}` : undefined,
            };
          },
        }),
      }),
    }),
  ],
});
const queryClient = new QueryClient();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element not found");
}
const root = ReactDOM.createRoot(rootEl);
root.render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>
);
