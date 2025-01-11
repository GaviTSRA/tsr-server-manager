import { trpc } from "../main";
import { Container } from "../components/Container";
import { MoonLoader } from "react-spinners";
import { Error } from "../components/Error";
import { createColumnHelper, useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { useMemo } from "react";

type Log = {
  user: {
    name: string;
  };
  success: boolean;
  date: string;
  log: string;
}

export function LogsTab({ serverId }: { serverId: string }) {
  const { data: logs, error } = trpc.server.logs.read.useQuery(
    { serverId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    });

  const columnHelper = createColumnHelper<Log>()

  const columns = useMemo(() => [
    columnHelper.accessor("success", {
      header: () => (<p></p>),
      cell: (cell) => (
        <div
          className={`border-solid rounded border-x-4 w-0 ${cell.getValue() ? "border-success" : "border-danger"}`}
        ><p className="opacity-0">a</p></div>)
    }),
    columnHelper.accessor("user.name", {
      header: () => (<p>User</p>),
      cell: (cell) => (<p className="px-2">{cell.getValue()}</p>)
    }),
    columnHelper.accessor("date", {
      header: () => (<p>Date</p>),
      cell: (cell) => new Date(cell.getValue()).toLocaleString()
    }),
    columnHelper.accessor("log", {
      header: () => (<p>Log</p>),
      cell: (cell) => cell.getValue()
    })
  ], []);

  const table = useReactTable<Log>({
    columns,
    data: logs ?? [],
    getCoreRowModel: getCoreRowModel()
  });

  if (error) {
    return <Error error={error} />
  }

  if (!logs) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <MoonLoader size={100} color={"#FFFFFF"} />
      </div>
    );
  }

  return (
    <Container className="h-full overflow-y-auto">
      <table className="table-auto w-full">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          {table.getFooterGroups().map(footerGroup => (
            <tr key={footerGroup.id}>
              {footerGroup.headers.map(header => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                      header.column.columnDef.footer,
                      header.getContext()
                    )}
                </th>
              ))}
            </tr>
          ))}
        </tfoot>
      </table>
    </Container>
  );
}
