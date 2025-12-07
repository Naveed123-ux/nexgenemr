"use client";

import React, { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchHospitalPatients } from "@/store/slices/hospitalPatientsSlice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HospitalPatient } from "@/hooks/types/types";
import { Search, Users, UserCheck, UserX, ArrowUpDown } from "lucide-react";

// Define table columns
const columns: ColumnDef<HospitalPatient>[] = [
  {
    accessorKey: "user_id",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium"
      >
        ID
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("user_id")}</div>
    ),
  },
  {
    accessorKey: "full_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-auto p-0 font-medium"
      >
        Patient Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("full_name")}</div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-sm text-gray-600">{row.getValue("email")}</div>
    ),
  },
  {
    accessorKey: "client_type",
    header: "Type",
    cell: ({ row }) => (
      <Badge variant="outline" className="text-xs">
        {row.getValue("client_type")}
      </Badge>
    ),
  },
  {
    accessorKey: "billing_type",
    header: "Billing",
    cell: ({ row }) => {
      const billingType = row.getValue("billing_type") as string;
      return (
        <Badge
          variant={billingType === "Insurance" ? "default" : "secondary"}
          className={`text-xs ${billingType === "Insurance" ? "bg-[#388fe5] hover:bg-[#6fb043] text-white" : ""}`}
        >
          {billingType}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as boolean;
      return (
        <Badge
          variant={status ? "default" : "destructive"}
          className={`text-xs ${status ? "bg-[#388fe5] hover:bg-[#6fb043] text-white" : ""}`}
        >
          {status ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "assigned_doctor_name",
    header: "Assigned Doctor",
    cell: ({ row }) => {
      const doctorName = row.getValue("assigned_doctor_name") as string | null;
      return (
        <div className="text-sm">
          {doctorName || <span className="text-gray-400">Unassigned</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "chief_complaint",
    header: "Chief Complaint",
    cell: ({ row }) => {
      const complaint = row.getValue("chief_complaint") as string | null;
      return (
        <div className="text-sm max-w-[200px] truncate">
          {complaint || <span className="text-gray-400">None</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "bay_or_room",
    header: "Room/Bay",
    cell: ({ row }) => {
      const room = row.getValue("bay_or_room") as string | null;
      return (
        <div className="text-sm">
          {room || <span className="text-gray-400">-</span>}
        </div>
      );
    },
  },
  {
    accessorKey: "triage_level",
    header: "Triage Level",
    cell: ({ row }) => {
      const triage = row.getValue("triage_level") as string | null;
      if (!triage) return <span className="text-gray-400">-</span>;

      const getTriageColor = (level: string) => {
        const lowerLevel = level.toLowerCase();
        if (lowerLevel.includes("high") || lowerLevel.includes("critical")) return "destructive";
        if (lowerLevel.includes("medium") || lowerLevel.includes("moderate")) return "default";
        return "secondary";
      };

      return (
        <Badge variant={getTriageColor(triage)} className="text-xs">
          {triage}
        </Badge>
      );
    },
  },
];

const LoadingState = () => (
  <div className="flex items-center justify-center h-80">
    <InfinitySpin width="300" color="#388fe5" aria-label="loading-patients" />
  </div>
);

const ErrorState = ({ error }: { error: string }) => (
  <div className="text-center py-10 px-4">
    <p className="text-red-500 font-semibold">Failed to load patients</p>
    <p className="text-gray-500 text-sm mt-1">{error}</p>
  </div>
);

const EmptyState = () => (
  <div className="text-center py-10 text-gray-500">
    <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
    <p className="text-lg font-medium">No patients found</p>
    <p className="text-sm">There are currently no patients in the hospital.</p>
  </div>
);

export default function HospitalPatientsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { patients, loading, error } = useSelector(
    (state: RootState) => state.hospitalPatients
  );

  const [globalFilter, setGlobalFilter] = React.useState("");

  // Fetch patients on component mount
  useEffect(() => {
    dispatch(fetchHospitalPatients());
  }, [dispatch]);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = patients.length;
    const active = patients.filter(p => p.status).length;
    const inactive = patients.filter(p => !p.status).length;
    const assigned = patients.filter(p => p.assigned_doctor_id).length;

    return { total, active, inactive, assigned };
  }, [patients]);

  const table = useReactTable({
    data: patients,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  const renderContent = () => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;
    if (patients.length === 0) return <EmptyState />;

    return (
      <div className="space-y-4">
        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search patients..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(String(event.target.value))}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-gray-50">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 text-left">
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
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
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
                  <td colSpan={columns.length} className="h-24 text-center">
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length} patients
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hospital Patients</h1>
        <p className="text-gray-600">Manage and view all patients in your hospital</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-600">Total Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-8 w-8 text-[#388fe5]" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-gray-600">Active Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserX className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-sm text-gray-600">Inactive Patients</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{stats.assigned}</p>
                <p className="text-sm text-gray-600">Assigned to Doctors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
