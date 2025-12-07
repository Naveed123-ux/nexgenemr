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
import { fetchAllHospitals } from "@/store/slices/superAdminslice";
import { InfinitySpin } from "react-loader-spinner";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, ArrowUpDown } from "lucide-react";
import { NotificationsPanel } from "@/components/notifications-panel";
import { AdminHeader } from "@/components/admin-header";
import { PencilSvg } from "@/components/svgs/svg";

// Define the hospital type
interface Allhospital {
  id: number;
  name: string;
  code: string;
  email: string;
  phone_number: string;
  country: string;
  logo_url: string;
}

// Define columns
const columns: ColumnDef<Allhospital>[] = [
  {
    accessorKey: "id",
    header: () => (
      <div className="text-left py-3 px-2 md:px-4 font-medium text-black text-sm">
        No
      </div>
    ),
    cell: ({ row }) => (
      <div className="py-3 px-2 md:px-4 text-black text-sm">
        {row.getValue("id")}
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: () => (
      <div className="flex items-center gap-2 text-left py-3 px-2 md:px-4 font-medium text-black text-sm">
        <span>Name</span>
        <ArrowUpDown className="w-5 h-5" />
      </div>
    ),
    cell: ({ row }) => {
      const { logo_url, name } = row.original;

      return (
        <div className="flex items-center gap-2 md:gap-3 py-3 px-2 md:px-4">
          <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-300 rounded-full flex-shrink-0 overflow-hidden">
            {logo_url ? (
              <img
                src={logo_url}
                alt={name}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="text-[10px] text-gray-500">N/A</span>
            )}
          </div>
          <span className="text-black text-sm">{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "code",
    header: () => (
      <div className="flex items-center gap-2 text-left py-3 px-2 md:px-4 font-medium text-black text-sm">
        <span>Code</span>
        <ArrowUpDown className="w-5 h-5" />
      </div>
    ),
    cell: ({ row }) => (
      <div className="py-3 px-2 md:px-4 text-black text-sm table-cell">
        {row.getValue("code")}
      </div>
    ),
  },
  {
    accessorKey: "email",
    header: () => (
      <div className="text-left py-3 px-2 md:px-4 font-medium text-black text-sm table-cell">
        Email
      </div>
    ),
    cell: ({ row }) => (
      <div className="py-3 px-2 md:px-4 text-black text-sm table-cell">
        {row.getValue("email") as string}
      </div>
    ),
  },
  {
    accessorKey: "phone_number",
    header: () => (
      <div className="text-left py-3 px-2 md:px-4 font-medium text-black text-sm table-cell">
        Phone no
      </div>
    ),
    cell: ({ row }) => (
      <div className="py-3 px-2 md:px-4 text-black text-sm table-cell">
        {row.getValue("phone_number") as string}
      </div>
    ),
  },
  {
    id: "actions",
    header: () => (
      <div className="text-left py-3 px-2 md:px-4 font-medium text-black text-sm">
        Action
      </div>
    ),
    cell: () => (
      <div className="flex gap-1 md:gap-2 py-3 px-2 md:px-4">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 md:h-8 md:w-8 p-0 rounded-full hover:bg-gray-100 bg-[#D9D9D9]"
          aria-label="Delete hospital"
        >
          <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 bg-[#388fe5] md:h-8 md:w-8 p-0 rounded-full hover:bg-blue-50"
          aria-label="Edit hospital"
        >
          <PencilSvg />
        </Button>
      </div>
    ),
  },
];

export default function SuperAdminDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { Allhospitals, loading, error, total, page, pageSize, totalPages } =
    useSelector((state: RootState) => state.superAdmin); // Updated to match slice name

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!hasFetched.current) {
      const fetchHospitals = async () => {
        try {
          await dispatch(fetchAllHospitals({ page: 1 })).unwrap();
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
      fetchHospitals();
    }
  }, [dispatch]);

  const table = useReactTable({
    data: Allhospitals,
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
        fetchAllHospitals({
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
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-medium text-black-600">
                New Hospitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-[#388fe5]">
                  125
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                  <div className="w-5 h-5 md:w-6 md:h-6 bg-white rounded-full opacity-80"></div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: "75%" }}
                ></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-medium text-black-600">
                Old Hospitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-[#388fe5]">
                  218
                </div>
                <div className="flex gap-1 items-end">
                  {[4, 6, 3, 8, 5, 9, 4, 7, 6].map((height, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-blue-400 rounded-full"
                      style={{ height: `${height * 3}px` }}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div
                  className="bg-pink-500 h-2 rounded-full"
                  style={{ width: "60%" }}
                ></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-medium text-black-600">
                Added Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-[#388fe5]">
                  25
                </div>
                <div className="w-12 md:w-16 h-6 md:h-8">
                  <svg viewBox="0 0 60 30" className="w-full h-full">
                    <polyline
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      points="0,20 10,15 20,18 30,12 40,16 50,10 60,14"
                    />
                  </svg>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: "45%" }}
                ></div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-medium text-black-600">
                Visitors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-[#388fe5]">
                  2,479
                </div>
                <div className="w-12 md:w-16 h-6 md:h-8">
                  <svg viewBox="0 0 60 30" className="w-full h-full">
                    <path
                      fill="rgba(59, 130, 246, 0.3)"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      d="M0,25 L10,20 L20,22 L30,15 L40,18 L50,12 L60,16 L60,30 L0,30 Z"
                    />
                  </svg>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: "85%" }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="bg-white shadow-sm rounded-lg border lg:col-span-1">
          <NotificationsPanel />
        </div>
      </div>
      <Card className="bg-white shadow-sm w-full">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Hospital Lists
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <InfinitySpin width="200" color="#388fe5" />
              </div>
            ) : Allhospitals.length === 0 ? (
              <div className="text-center py-6 text-gray-600">
                No hospitals found
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="">
                        {headerGroup.headers.map((header) => (
                          <th key={header.id}>
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
                      <tr key={row.id} className="bg-[#EEEFF2] rounded-2xl">
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
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Total: {total} items
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="bg-gray-100 hover:bg-gray-200"
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {table.getState().pagination.pageIndex + 1} of{" "}
                      {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="bg-gray-100 hover:bg-gray-200"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
