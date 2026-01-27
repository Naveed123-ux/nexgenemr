"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Filter, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";

// Mock data for lab requests
const mockRequests = [
    {
        id: "REQ-001",
        patientName: "John Doe",
        doctorName: "Dr. Sarah Smith",
        testType: "Complete Blood Count (CBC)",
        priority: "Urgent",
        status: "Pending",
        date: "2024-03-20",
    },
    {
        id: "REQ-002",
        patientName: "Jane Cooper",
        doctorName: "Dr. Michael Brown",
        testType: "Urinalysis",
        priority: "Normal",
        status: "Pending",
        date: "2024-03-19",
    },
    {
        id: "REQ-003",
        patientName: "Robert Fox",
        doctorName: "Dr. Sarah Smith",
        testType: "Lipid Panel",
        priority: "Normal",
        status: "Processing",
        date: "2024-03-19",
    },
    {
        id: "REQ-004",
        patientName: "Emily Johnson",
        doctorName: "Dr. James Wilson",
        testType: "Thyroid Panel",
        priority: "Low",
        status: "Completed",
        date: "2024-03-18",
    },
];

export default function RequestsPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");

    const filteredRequests = mockRequests.filter(
        (req) =>
            req.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "Urgent":
                return "bg-red-100 text-red-800 hover:bg-red-100";
            case "Normal":
                return "bg-blue-100 text-blue-800 hover:bg-blue-100";
            case "Low":
                return "bg-gray-100 text-gray-800 hover:bg-gray-100";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Pending":
                return "bg-yellow-100 text-yellow-800";
            case "Processing":
                return "bg-blue-100 text-blue-800";
            case "Completed":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lab Requests</h1>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search requests..."
                            className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon">
                        <Filter className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                {filteredRequests.map((request) => (
                    <Card key={request.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-lg text-gray-900">{request.patientName}</span>
                                        <span className="text-sm text-gray-500">#{request.id}</span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Prescribed by <span className="font-medium text-gray-900">{request.doctorName}</span> • {request.date}
                                    </div>
                                    <div className="text-sm font-medium text-blue-600">
                                        {request.testType}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <Badge variant="secondary" className={getPriorityColor(request.priority)}>
                                        {request.priority}
                                    </Badge>
                                    <Badge variant="outline" className={getStatusColor(request.status)}>
                                        {request.status}
                                    </Badge>

                                    {request.status !== "Completed" && (
                                        <Button
                                            size="sm"
                                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                                            onClick={() => router.push(`/lab-technician/upload?id=${request.id}`)}
                                        >
                                            <UploadCloud className="w-4 h-4" />
                                            Upload
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
