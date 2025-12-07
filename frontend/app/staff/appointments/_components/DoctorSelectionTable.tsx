"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchAllDoctors } from "@/store/slices/allDoctors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfinitySpin } from "react-loader-spinner";
import { ColumnDef, flexRender, getCoreRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { DoctorProfile } from "./types";
import toast from "react-hot-toast";

interface DoctorSelectionTableProps {
    onDoctorSelect: (doctor: DoctorProfile) => void;
}

const columns: ColumnDef<DoctorProfile>[] = [
    { accessorKey: "user_id", header: "ID" },
    {
        accessorKey: "first_name",
        header: "Name",
        cell: ({ row }) => (
            <div className="flex items-center gap-2">
                <img
                    src={row.original.profile_picture_url || "/default-avatar.png"}
                    alt={row.original.first_name}
                    className="w-8 h-8 rounded-full object-cover"
                />
                <span>{row.original.first_name} {row.original.last_name}</span>
            </div>
        )
    },
    { accessorKey: "specialization", header: "Specialization" },
    { accessorKey: "department_name", header: "Department" },
];

export function DoctorSelectionTable({ onDoctorSelect }: DoctorSelectionTableProps) {
    const dispatch = useDispatch<AppDispatch>();
    const { AllDoctors, loading, error, totalPages, page, pageSize } = useSelector((state: RootState) => state.allDoctors);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!hasFetched.current) {
            dispatch(fetchAllDoctors({ page: 1 }));
            hasFetched.current = true;
        }
    }, [dispatch]);

    useEffect(() => {
        if (error) toast.error(error);
    }, [error]);

    const table = useReactTable({
        data: AllDoctors,
        columns: [
            ...columns,
            {
                id: "actions",
                header: "Action",
                cell: ({ row }) => (
                    <Button variant="outline" size="sm" onClick={() => onDoctorSelect(row.original)}>
                        Select
                    </Button>
                ),
            },
        ],
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        manualPagination: true,
        pageCount: totalPages,
        state: { pagination: { pageIndex: page - 1, pageSize } },
        onPaginationChange: (updater) => {
            const newPageIndex = typeof updater === 'function' ? updater({ pageIndex: page - 1, pageSize }).pageIndex : updater.pageIndex;
            dispatch(fetchAllDoctors({ page: newPageIndex + 1 }));
        },
    });

    return (
        <Card className="bg-white shadow-sm w-full">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-800">Step 1: Select a Doctor</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    {loading && AllDoctors.length === 0 ? (
                        <div className="flex items-center justify-center py-6"><InfinitySpin width="80" color="#388fe5" /></div>
                    ) : (
                        <>
                            <table className="w-full">
                                <thead>
                                    {table.getHeaderGroups().map(hg => (
                                        <tr key={hg.id}>
                                            {hg.headers.map(h => <th key={h.id} className="text-left py-2 px-4 font-medium">{flexRender(h.column.columnDef.header, h.getContext())}</th>)}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.map(row => (
                                        <tr key={row.id} className="border-b">
                                            {row.getVisibleCells().map(cell => <td key={cell.id} className="py-3 px-4">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex items-center justify-end gap-4 mt-4">
                                <span className="text-sm">Page {page} of {totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Previous</Button>
                                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}