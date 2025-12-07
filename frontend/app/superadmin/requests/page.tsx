"use client";

import React, { useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import {
  fetchHospitalRequests,
  updateHospitalRequestStatus,
  deleteHospitalRequest,
  HospitalRequest,
} from "@/store/slices/hospitalRequestsSlice";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // Assuming you have a Badge component

export default function HospitalRequestsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { requests, status, error } = useSelector(
    (state: RootState) => state.hospitalRequests
  );

  useEffect(() => {
    // Fetch requests only if the state is idle
    if (status === "idle") {
      dispatch(fetchHospitalRequests());
    }
  }, [status, dispatch]);

  useEffect(() => {
    // Display toast notifications for errors
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const handleUpdateStatus = (
    requestId: number,
    newStatus: "accepted" | "rejected"
  ) => {
    toast.promise(
      dispatch(
        updateHospitalRequestStatus({ requestId, status: newStatus })
      ).unwrap(),
      {
        loading: "Updating status...",
        success: `Request ${newStatus}!`,
        error: (err) => err || "Failed to update.",
      }
    );
  };

  const handleDelete = (requestId: number) => {
    toast.promise(dispatch(deleteHospitalRequest(requestId)).unwrap(), {
      loading: "Deleting request...",
      success: "Request deleted successfully!",
      error: (err) => err || "Failed to delete request.",
    });
  };

  // Define columns for the table
  const columns: ColumnDef<HospitalRequest>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "phone_number", header: "Phone" },
    { accessorKey: "country", header: "Country" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const variant =
          status === "accepted"
            ? "outline"
            : status === "rejected"
              ? "destructive"
              : "secondary";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const request = row.original;
        const isPending = request.status === "pending";

        return (
          <div className="flex gap-2">
            {isPending && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-[#388fe5] hover:bg-green-100"
                  onClick={() => handleUpdateStatus(request.id, "accepted")}
                  aria-label="Accept request"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-100"
                  onClick={() => handleUpdateStatus(request.id, "rejected")}
                  aria-label="Reject request"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-100"
              onClick={() => handleDelete(request.id)}
              aria-label="Delete request"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Hospital Join Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {status === "loading" ? (
              <div className="flex justify-center py-10">
                <InfinitySpin width="200" color="#388fe5" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No pending requests found.
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="text-left p-2 font-medium text-sm"
                        >
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
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="p-2 text-sm">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
