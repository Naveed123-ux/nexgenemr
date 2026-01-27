"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText, CheckCircle } from "lucide-react";

// Mock data for completed reports
const mockReports = [
    {
        id: "REP-2024-001",
        requestId: "REQ-004",
        patientName: "Emily Johnson",
        testType: "Thyroid Panel",
        dateSubmitted: "2024-03-18",
        status: "Sent to Doctor",
        aiConfidence: "99.2%",
    },
    {
        id: "REP-2024-002",
        requestId: "REQ-005",
        patientName: "Michael Brown",
        testType: "Lipid Panel",
        dateSubmitted: "2024-03-17",
        status: "Sent to Doctor",
        aiConfidence: "98.5%",
    },
];

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Submitted Reports</h1>
            </div>

            <div className="grid gap-4">
                {mockReports.map((report) => (
                    <Card key={report.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{report.patientName}</h3>
                                    <div className="text-sm text-gray-500 flex items-center gap-2">
                                        <span>{report.testType}</span>
                                        <span>•</span>
                                        <span>{report.dateSubmitted}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-medium text-gray-900">AI Confidence</p>
                                    <p className="text-sm text-blue-600 font-bold">{report.aiConfidence}</p>
                                </div>
                                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 px-3 py-1">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {report.status}
                                </Badge>
                                <Button variant="ghost" size="icon">
                                    <Eye className="w-5 h-5 text-gray-400" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
