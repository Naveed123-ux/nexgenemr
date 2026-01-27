"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, UploadCloud, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { labRequestApi, LabRequest } from "@/app/_apis/lab_requests";
import { toast } from "react-hot-toast";

export default function RequestsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [requests, setRequests] = useState<LabRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchRequests();
    }, [page, statusFilter]);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const params = {
                page,
                size: 10,
                status: statusFilter === "ALL" ? undefined : statusFilter
            };
            const response = await labRequestApi.listAllRequests(params);
            setRequests(response.items);
            setTotalPages(response.totalPages);
        } catch (error) {
            console.error("Error fetching requests:", error);
            toast.error("Failed to load lab requests");
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (requestId: number) => {
        try {
            await labRequestApi.acceptRequest(requestId);
            toast.success("Request accepted");
            fetchRequests(); // Refresh list
        } catch (error) {
            toast.error("Failed to accept request");
        }
    };

    const handleReject = async (requestId: number) => {
        if (!confirm("Are you sure you want to reject this request?")) return;
        try {
            await labRequestApi.rejectRequest(requestId);
            toast.success("Request rejected");
            fetchRequests();
        } catch (error) {
            toast.error("Failed to reject request");
        }
    };

    const filteredRequests = requests.filter(
        (req) =>
            req.id.toString().includes(searchTerm) ||
            (req.patient_name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "URGENT":
                return "bg-red-100 text-red-800 hover:bg-red-100";
            case "NORMAL":
                return "bg-blue-100 text-blue-800 hover:bg-blue-100";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "PENDING":
                return "bg-yellow-100 text-yellow-800";
            case "ACCEPTED":
                return "bg-blue-100 text-blue-800";
            case "COMPLETED":
                return "bg-green-100 text-green-800";
            case "APPROVED":
                return "bg-indigo-100 text-indigo-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lab Requests</h1>
                <div className="flex flex-wrap items-center gap-2">
                    <select
                        className="p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="ACCEPTED">Accepted</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="REJECTED">Rejected</option>
                    </select>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search ID or Patient..."
                            className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={fetchRequests}>
                        <Filter className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-gray-500 font-medium">Loading requests...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <Card className="border-dashed border-2 p-10 text-center text-gray-500">
                    No lab requests found matching your search.
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredRequests.map((request) => (
                        <Card key={request.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-lg text-gray-900">Request #{request.id}</span>
                                            <Badge variant="outline" className={getStatusColor(request.status)}>
                                                {request.status}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            Type: <span className="font-medium text-gray-900">{request.request_type.replace('_', ' ')}</span> • Created: {new Date(request.created_at).toLocaleDateString()}
                                        </div>
                                        <div className="text-sm font-medium text-blue-600">
                                            Patient ID: {request.patient_id} • Doctor ID: {request.doctor_id}
                                        </div>
                                        {request.notes && (
                                            <p className="text-sm text-gray-500 italic mt-2">"{request.notes}"</p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3">
                                        <Badge variant="secondary" className={getPriorityColor(request.priority)}>
                                            {request.priority}
                                        </Badge>

                                        {request.status === "PENDING" && (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => handleReject(request.id)}
                                                >
                                                    Reject
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                                    onClick={() => handleAccept(request.id)}
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Accept
                                                </Button>
                                            </div>
                                        )}

                                        {request.status === "ACCEPTED" && (
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                                onClick={() => router.push(`/lab-technician/upload?id=${request.id}`)}
                                            >
                                                <UploadCloud className="w-4 h-4" />
                                                Process & Upload
                                            </Button>
                                        )}

                                        {(request.status === "COMPLETED" || request.status === "APPROVED") && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => router.push(`/lab-technician/reports/${request.id}`)}
                                            >
                                                View Results
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-gray-600 font-medium">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => setPage(page + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
