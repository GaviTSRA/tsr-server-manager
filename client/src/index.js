import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import ServerList from "./ServerList";
import { QueryClientProvider, QueryClient } from "react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Server } from "./Server";

const queryClient = new QueryClient();
const router = createBrowserRouter([
  {
    path: "/",
    element: <ServerList />,
  },
  {
    path: "/:serverId",
    element: <Server />,
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} className="h-full" />
    </QueryClientProvider>
  </React.StrictMode>
);
