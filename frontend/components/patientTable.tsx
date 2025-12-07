// src/app/dashboard/patients/page.tsx (or your component file)

"use client";

import React, { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";

// State Management & Utils
import { AppDispatch, RootState } from "@/store/store";
import { fetchAllPatients } from "@/store/slices/patientSlice"; // Corrected path to match file name
import { createColumnsFromData, DynamicData } from "@/lib/tableUtils"; // UPDATED: Import the new automatic function

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { InfinitySpin } from "react-loader-spinner";
import Link from "next/link";
import { useRouter } from "next/navigation";
const PatientTable = ({
  data,
  columns,
  link,
}: {
  data: DynamicData[];
  columns: ColumnDef<DynamicData>[];
  link:string
}) => {
  const router = useRouter(); // <-- Initialize the router
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleRowClick = (row: any) => {
    const patientId = row.original.patientID; // <-- Get the correct patientID
    if (patientId) {
      router.push(`/${link}/${patientId}`);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* ... thead is unchanged ... */}
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="text-left p-4 font-medium text-gray-600">
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
              <tr
                key={row.id}
                onClick={() => handleRowClick(row)} // <-- Add onClick handler
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" // <-- Add cursor-pointer
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-4 text-gray-700">
                    {/* The <Link> component is now removed from here */}
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ... Pagination Controls are unchanged ... */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Total Rows: {table.getCoreRowModel().rows.length}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
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
    </>
  );
};
export default PatientTable;
