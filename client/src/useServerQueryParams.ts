import { useParams } from "react-router-dom";

export function useServerQueryParams() {
  return useParams() as {
    serverId: string;
    nodeId: string;
    tab: string;
  };
}
