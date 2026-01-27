"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, CheckCircle2, AlertCircle } from "lucide-react";

export default function LabTechnicianDashboard() {
    // Mock data for dashboard stats
    const stats = [
        {
            title: "Pending Requests",
            value: "12",
            icon: Clock,
            color: "text-yellow-600",
            bgColor: "bg-yellow-100",
        },
        {
            title: "Completed Today",
            value: "25",
            icon: CheckCircle2,
            color: "text-green-600",
            bgColor: "bg-green-100",
        },
        {
            title: "Urgent Requests",
            value: "3",
            icon: AlertCircle,
            color: "text-red-600",
            bgColor: "bg-red-100",
        },
        {
            title: "Total Tests Included",
            value: "1,234",
            icon: Activity,
            color: "text-blue-600",
            bgColor: "bg-blue-100",
        },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Card key={index} className="border-none shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                            <CardTitle className="text-sm font-medium text-gray-500">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${stat.bgColor}`}>
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <p className="text-xs text-gray-500 mt-1">
                                +2.5% from last month
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[1, 2, 3].map((_, i) => (
                                <div key={i} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">Blood Test Result Uploaded</p>
                                        <p className="text-xs text-gray-500">2 hours ago • Patient #4562</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors group">
                            <div className="p-3 bg-white rounded-full text-blue-600 group-hover:scale-110 transition-transform">
                                <Clock className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-gray-700">View Requests</span>
                        </button>
                        <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl flex flex-col items-center justify-center gap-2 transition-colors group">
                            <div className="p-3 bg-white rounded-full text-purple-600 group-hover:scale-110 transition-transform">
                                <Activity className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-gray-700">Upload Report</span>
                        </button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
