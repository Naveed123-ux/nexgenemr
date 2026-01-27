"use client";

import React, { useEffect, useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { useSelector, useDispatch } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchAllDoctors, toggleDoctorStatus } from "@/store/slices/allDoctors";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, ArrowUpDown, Mail, Phone, MapPin, Edit, Eye, UserCheck, UserMinus } from "lucide-react";
import { DoctorProfile } from "@/hooks/types/types";

export default function AllDoctors() {
  const dispatch = useDispatch<AppDispatch>();
  const { AllDoctors, loading, error, total, page, pageSize, totalPages } =
    useSelector((state: RootState) => state.allDoctors);

  const handleToggleStatus = async (doctorUserId: number) => {
    try {
      await dispatch(toggleDoctorStatus(doctorUserId)).unwrap();
    } catch (error) {
      console.error("Toggle error:", error);
    }
  };

  const columns: ColumnDef<DoctorProfile>[] = [
    {
      accessorKey: "user_id",
      header: () => (
        <div className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
          ID
        </div>
      ),
      cell: ({ row }) => (
        <div className="py-4 px-6 text-gray-600 text-sm font-medium">
          #{row.getValue("user_id")}
        </div>
      ),
    },
    {
      accessorKey: "first_name",
      header: () => (
        <div className="flex items-center gap-2 text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
          <span>Doctor</span>
        </div>
      ),
      cell: ({ row }) => {
        const { profile_picture_url, first_name, last_name } = row.original;
        const initials = `${first_name?.charAt(0) || ''}${last_name?.charAt(0) || ''}`;

        return (
          <div className="flex items-center gap-3 py-4 px-6">
            <Avatar className="h-10 w-10 border-2 border-gray-200">
              <AvatarImage src={profile_picture_url} alt={`${first_name} ${last_name}`} />
              <AvatarFallback className="bg-[#388fe5] text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Dr. {first_name} {last_name}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: () => (
        <div className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
          Contact
        </div>
      ),
      cell: ({ row }) => (
        <div className="py-4 px-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="w-4 h-4 text-gray-400" />
            <span>{row.getValue("email") as string}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "specialization",
      header: () => (
        <div className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
          Specialization
        </div>
      ),
      cell: ({ row }) => (
        <div className="py-4 px-6">
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            {row.getValue("specialization") as string}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: () => (
        <div className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
          Status
        </div>
      ),
      cell: ({ row }) => {
        const isActive = row.getValue("is_active") as boolean;
        return (
          <div className="py-4 px-6">
            <Badge className={isActive ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => (
        <div className="text-right py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
          Actions
        </div>
      ),
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return (
          <div className="py-4 px-6 text-right">
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggleStatus(row.original.user_id)}
                className={isActive
                  ? "text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 flex items-center gap-1 px-3"
                  : "text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 flex items-center gap-1 px-3"
                }
              >
                {isActive ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    Activate
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Eye className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          </div>
        );
      },
    },
  ];

  const hasFetched = useRef(false);


  useEffect(() => {
    if (!hasFetched.current) {
      const fetchDoctors = async () => {
        try {
          await dispatch(fetchAllDoctors({ page: 1 })).unwrap();
          hasFetched.current = true;
          console.log("State after fetch:", {
            total,
            page,
            pageSize,
            totalPages,
          });
        } catch (error) {
          console.error("Fetch error:", error);
          toast.error("Failed to fetch hospitals", { id: "hospital-error" });
        }
      };
      fetchDoctors();
    }
  }, [dispatch]);

  const table = useReactTable({
    data: AllDoctors,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    onPaginationChange: (updater) => {
      const newState =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize })
          : updater;
      dispatch(
        fetchAllDoctors({
          page: newState.pageIndex + 1,
        })
      );
      console.log("Pagination to page:", newState.pageIndex + 1);
    },
  });

  useEffect(() => {
    if (error) {
      toast.error(error, { id: "hospital-error" });
    }
  }, [error]);

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <InfinitySpin width="200" color="#388fe5" />
        </div>
      ) : AllDoctors.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No doctors found</p>
          <p className="text-gray-400 text-sm mt-2">Add your first doctor to get started</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="text-left">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200">
                {table.getRowModel().rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
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
          </div>
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{AllDoctors.length}</span> of{" "}
              <span className="font-semibold">{total}</span> doctors
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="hover:bg-white"
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 px-3">
                Page <span className="font-semibold">{table.getState().pagination.pageIndex + 1}</span> of{" "}
                <span className="font-semibold">{totalPages}</span>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="hover:bg-white"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
