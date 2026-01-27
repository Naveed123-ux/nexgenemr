"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Activity,
    Clock,
    CheckCircle2,
    AlertCircle,
    UploadCloud,
    Search,
    ArrowRight,
    CalendarIcon
} from "lucide-react";
import { labRequestApi, LabRequest } from "@/app/_apis/lab_requests";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LabTechnicianDashboard() {
    const router = useRouter();
    const [requests, setRequests] = useState<LabRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch first page to get initial data and total
                const response = await labRequestApi.listAllRequests({ page: 1, size: 100 });
                setRequests(response.items);
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const stats = [
        {
            title: "Pending Requests",
            value: requests.filter(r => r.status === "PENDING").length.toString(),
            icon: Clock,
            color: "text-amber-600",
            bgColor: "bg-amber-100",
            desc: "Awaiting acceptance"
        },
        {
            title: "In Progress",
            value: requests.filter(r => r.status === "ACCEPTED").length.toString(),
            icon: Activity,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
            desc: "Currently being processed"
        },
        {
            title: "Urgent (New)",
            value: requests.filter(r => r.status === "PENDING" && r.priority === "URGENT").length.toString(),
            icon: AlertCircle,
            color: "text-red-600",
            bgColor: "bg-red-100",
            desc: "Priority tasks"
        },
        {
            title: "Completed",
            value: requests.filter(r => ["COMPLETED", "APPROVED"].includes(r.status)).length.toString(),
            icon: CheckCircle2,
            color: "text-emerald-600",
            bgColor: "bg-emerald-100",
            desc: "Finished today"
        },
    ];

    const recentRequests = requests
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium">Loading Dashboard...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lab Overview</h1>
                <p className="text-gray-500">Welcome back! Here's what's happening in the lab today.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Card key={index} className="border-none shadow-sm hover:shadow-md transition-all">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-600">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                            <p className="text-xs text-gray-500 mt-1">{stat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Recent Requests */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Recent Requests</h2>
                        <Button variant="ghost" className="text-blue-600 hover:text-blue-700 gap-1" onClick={() => router.push('/lab-technician/requests')}>
                            View all <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="grid gap-3">
                        {recentRequests.length === 0 ? (
                            <Card className="p-8 text-center text-gray-500 border-dashed border-2">
                                No recent requests found.
                            </Card>
                        ) : (
                            recentRequests.map((req) => (
                                <Card key={req.id} className="border-none shadow-sm hover:ring-1 hover:ring-blue-100 transition-all cursor-pointer" onClick={() => router.push('/lab-technician/requests')}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${req.priority === 'URGENT' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                                                }`}>
                                                {req.id}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">{req.request_type.replace('_', ' ')}</p>
                                                <p className="text-sm text-gray-500">Patient ID: {req.patient_id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className={
                                                req.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                                            }>
                                                {req.status}
                                            </Badge>
                                            <span className="text-xs text-gray-400 font-medium">
                                                {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
                    <div className="grid gap-4">
                        <Button
                            className="w-full h-auto py-6 flex flex-col items-center gap-2 bg-gradient-to-br from-blue-600 to-indigo-700 hover:opacity-90 shadow-lg shadow-blue-100"
                            onClick={() => router.push('/lab-technician/requests')}
                        >
                            <Search className="w-8 h-8" />
                            <div className="text-center">
                                <div className="font-bold text-lg">Browse Requests</div>
                                <div className="text-xs opacity-80">Find new lab orders</div>
                            </div>
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full h-auto py-6 flex flex-col items-center gap-2 border-2 hover:bg-gray-50 transition-all border-gray-100"
                            onClick={() => router.push('/lab-technician/requests')}
                        >
                            <UploadCloud className="w-8 h-8 text-indigo-600" />
                            <div className="text-center">
                                <div className="font-bold text-lg text-gray-900">Process MRI</div>
                                <div className="text-xs text-gray-500">Run AI Diagnosis</div>
                            </div>
                        </Button>
                    </div>

                    <Card className="border-none bg-indigo-50 mt-4">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm text-indigo-900">System Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2 text-indigo-700">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-sm font-medium text-indigo-900">AI Model Online (v2.1)</span>
                            </div>
                            <p className="text-xs text-indigo-600 mt-2 font-medium">
                                GPU Acceleration active. Average prediction time: 1.2s
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}