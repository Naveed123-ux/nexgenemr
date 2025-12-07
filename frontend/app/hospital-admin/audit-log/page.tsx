// components/SuperAdminDashboard.tsx

"use client";

import React, { useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchAllLogs, clearError } from "@/store/slices/AuditSlice";
import { Log } from "@/hooks/types/types"; // Import your updated Log type
import { InfinitySpin } from "react-loader-spinner";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
} from "lucide-react";
import { saveAs } from "file-saver";

// CHANGED: Updated columns to match the new API response
const columns: ColumnDef<Log>[] = [
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ row }) => {
      const formattedTime = new Date(
        row.getValue("timestamp") as string
      ).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      return <div className="py-3 px-4 text-sm">{formattedTime}</div>;
    },
  },
  {
    accessorKey: "user_email",
    header: "User Email",
  },
  {
    accessorKey: "user_role",
    header: "User Role",
  },
  {
    accessorKey: "http_method",
    header: "Request",
    cell: ({ row }) => {
      const { http_method, path } = row.original;
      let badgeClass = "";
      switch (http_method) {
        case "POST":
          badgeClass = "bg-green-200 text-green-800";
          break;
        case "GET":
          badgeClass = "bg-blue-200 text-blue-800";
          break;
        case "PUT":
          badgeClass = "bg-yellow-200 text-yellow-800";
          break;
        case "DELETE":
          badgeClass = "bg-red-200 text-red-800";
          break;
        default:
          badgeClass = "bg-gray-200 text-gray-800";
      }
      return (
        <div className="py-3 px-4 text-sm">
          <Badge className={`${badgeClass} rounded-full px-2 py-1`}>
            {http_method}
          </Badge>
          <span className="ml-2 font-mono">{path}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "status_code",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status_code") as number;
      let badgeClass = "";
      if (status >= 200 && status < 300)
        badgeClass = "bg-green-200 text-green-800";
      else if (status >= 400 && status < 500)
        badgeClass = "bg-yellow-200 text-yellow-800";
      else if (status >= 500) badgeClass = "bg-red-200 text-red-800";
      else badgeClass = "bg-gray-200 text-gray-800";

      return (
        <div className="py-3 px-4 text-sm">
          <Badge className={`${badgeClass} rounded-full px-2 py-1`}>
            {status as number}
          </Badge>
        </div>
      );
    },
  },
];

export default function SuperAdminDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { allLogs, loading, error } = useSelector(
    (state: RootState) => state.audit
  );
  // State for client-side filtering
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    // Fetch logs on initial component mount
    dispatch(fetchAllLogs());
  }, [dispatch]);

  // CHANGED: useReactTable now handles pagination on the client-side
  const table = useReactTable({
    data: allLogs,
    columns,
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  useEffect(() => {
    if (error) {
      toast.error(error, { id: "logs-error" });
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const handleExportCSV = () => {
    // Use getFilteredRowModel() to export only the data that matches the current search filter.
    // If you want to export ALL data regardless of the filter, use table.getCoreRowModel().rows
    const rowsToExp = table.getFilteredRowModel().rows;

    if (rowsToExp.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = [
      "Timestamp",
      "User Email",
      "User Role",
      "HTTP Method",
      "Path",
      "Status Code",
    ];

    // Helper function to safely format a cell for CSV
    const formatCsvCell = (cellData: any) => {
      if (cellData === null || cellData === undefined) {
        return "";
      }
      const str = String(cellData);
      // If the string contains a comma, double-quote, or newline, wrap it in double-quotes.
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        // Escape any existing double-quotes by doubling them up.
        const escapedStr = str.replace(/"/g, '""');
        return `"${escapedStr}"`;
      }
      return str;
    };

    const csvRows = rowsToExp.map((row) => {
      const rowData = [
        new Date(row.original.timestamp).toISOString(),
        row.original.user_email,
        row.original.user_role,
        row.original.http_method,
        row.original.path,
        row.original.status_code,
      ];
      return rowData.map(formatCsvCell).join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "audit_logs.csv");
    toast.success("CSV exported successfully");
  };

  const handleRefresh = () => {
    dispatch(fetchAllLogs());
  };

  return (
    <div className="p-4 md:p-6">
      <Card className="bg-white shadow-sm w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search all columns..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="p-2 pl-8 border rounded w-full"
              />
              <Search className="absolute left-2 top-2.5 text-gray-400 h-4 w-4" />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportCSV}
                disabled={loading || !allLogs.length}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <InfinitySpin width="200" color="#388fe5" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="text-left p-4 font-medium">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-b">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="p-2">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="text-center py-6 text-gray-600"
                      >
                        No audit logs found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* CHANGED: Pagination UI now controlled by react-table */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {table.getRowModel().rows.length} of {allLogs.length}{" "}
              results
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
              </span>
              <Button
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}