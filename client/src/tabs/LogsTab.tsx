import { trpc } from "../main";
import { Container } from "../components/Container";
import { MoonLoader } from "react-spinners";
import { Error } from "../components/Error";
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  flexRender,
  Row,
} from "@tanstack/react-table";
import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, X } from "react-feather";
import { useServerQueryParams } from "../Server";

type Log = {
  user: {
    name: string;
  };
  success: boolean;
  date: Date;
  log: string;
};

export function LogsTab() {
  const { nodeId, serverId } = useServerQueryParams();
  const { data: logs, error } = trpc.server.logs.read.useQuery(
    { serverId, nodeId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  );

  const columnHelper = createColumnHelper<Log>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("success", {
        size: 35,
        header: () => <p></p>,
        cell: (cell) => (
          <div>
            {cell.getValue() ? (
              <Check className="text-success" />
            ) : (
              <X className="text-danger" />
            )}
          </div>
        ),
      }),
      columnHelper.accessor("user.name", {
        size: 120,
        header: () => <p className="py-1">User</p>,
        cell: (cell) => <p className="px-2">{cell.getValue()}</p>,
      }),
      columnHelper.accessor("date", {
        size: 180,
        header: () => <p>Date</p>,
        cell: (cell) => new Date(cell.getValue()).toLocaleString(),
      }),
      columnHelper.accessor("log", {
        size: 800,
        header: () => <p>Log</p>,
        cell: (cell) => cell.getValue(),
      }),
    ],
    []
  );

  const table = useReactTable<Log>({
    columns,
    data: logs ?? [],
    getCoreRowModel: getCoreRowModel(),
    debugTable: true,
  });

  const { rows } = table.getRowModel();

  //The virtualizer needs to know the scrollable container element
  const tableContainerRef = useRef<HTMLDivElement>(null);

  console.info(rows.length);
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    estimateSize: () => 33, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
      typeof window !== "undefined" &&
        navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  });

  if (error) {
    return <Error error={error} />;
  }

  if (!logs) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  return (
    <Container
      className="overflow-auto relative h-full p-0!"
      expanded={true}
      innerRef={tableContainerRef}
    >
      <table className="grid">
        <thead className="grid sticky top-0 z-10 bg-neutral-150">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="flex w-full items-center">
              {headerGroup.headers.map((header) => {
                return (
                  <th
                    key={header.id}
                    className="flex items-center border-r-2 h-full last:border-r-0 border-neutral-200 px-2 py-1"
                    style={{
                      width: header.getSize(),
                    }}
                  >
                    <div
                      {...{
                        className: header.column.getCanSort()
                          ? "cursor-pointer select-none"
                          : "",
                        onClick: header.column.getToggleSortingHandler(),
                      }}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                      {{
                        asc: " 🔼",
                        desc: " 🔽",
                      }[header.column.getIsSorted() as string] ?? null}
                    </div>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody
          className="grid relative w-full"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index] as Row<Log>;
            return (
              <tr
                data-index={virtualRow.index}
                ref={(node) => rowVirtualizer.measureElement(node)}
                key={row.id}
                className="flex absolute w-full border-b-2 last:border-b-0 border-neutral-300"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  return (
                    <td
                      key={cell.id}
                      className="flex items-center border-r-2 last:border-r-0 border-neutral-300 px-1 py-1"
                      style={{
                        width: cell.column.getSize(),
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </Container>
  );
}
