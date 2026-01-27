"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { labRequestApi, LabRequest } from "@/app/_apis/lab_requests";
import { toast } from "react-hot-toast";

export default function ReportsPage() {
    const router = useRouter();
    const [reports, setReports] = useState<LabRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                // Fetch ALL status to filter client-side or we could add a status filter to API
                // optimally we should filter by multiple statuses in backend, but for now filtering locally or querying 'COMPLETED' is okay.
                // However, we want COMPLETED and APPROVED. 
                // Let's fetch all and filter for now as the API supports single status or all.
                const response = await labRequestApi.listAllRequests({ size: 100 });

                const completedReports = response.items.filter(r =>
                    ["COMPLETED", "APPROVED"].includes(r.status)
                );

                setReports(completedReports);
            } catch (error) {
                console.error("Failed to fetch reports:", error);
                toast.error("Failed to load reports");
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-gray-500 font-medium">Loading reports...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Submitted Reports</h1>
            </div>

            <div className="grid gap-4">
                {reports.length === 0 ? (
                    <Card className="border-dashed border-2 p-10 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                            <AlertCircle className="w-10 h-10 text-gray-300" />
                            <p>No completed reports found.</p>
                        </div>
                    </Card>
                ) : (
                    reports.map((report) => (
                        <Card key={report.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => router.push(`/lab-technician/reports/${report.id}`)}>
                            <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${report.brain_tumor_result?.result_class === 'YES' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                        }`}>
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-gray-900">{report.patient_name || `Patient #${report.patient_id}`}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border">#{report.id}</span>
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                            <span className="font-medium text-gray-700">{report.request_type.replace('_', ' ')}</span>
                                            <span>•</span>
                                            <span>{new Date(report.updated_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6 justify-between md:justify-end w-full md:w-auto">
                                    {report.brain_tumor_result && (
                                        <div className="text-right">
                                            <p className="text-xs font-semibold text-gray-400 uppercase">Confidence</p>
                                            <p className="text-lg text-blue-600 font-bold">
                                                {(report.brain_tumor_result.confidence * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    )}

                                    <Badge className={`${report.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                        } hover:bg-opacity-80 px-3 py-1 flex gap-1 items-center`}>
                                        <CheckCircle className="w-3 h-3" />
                                        {report.status}
                                    </Badge>

                                    <Button variant="ghost" size="icon" onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/lab-technician/reports/${report.id}`);
                                    }}>
                                        <Eye className="w-5 h-5 text-gray-400 hover:text-blue-600" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
