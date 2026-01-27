"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { labRequestApi, LabRequest } from "@/app/_apis/lab_requests";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Calendar, User, FileText, CheckCircle2, XCircle, AlertCircle, Activity } from "lucide-react";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

export default function LabResultDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [request, setRequest] = useState<LabRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRequest = async () => {
            if (!params.id) return;
            setIsLoading(true);
            try {
                const data = await labRequestApi.getRequestById(Number(params.id));
                setRequest(data);
            } catch (error) {
                console.error("Failed to fetch lab request:", error);
                toast.error("Failed to load lab request details");
            } finally {
                setIsLoading(false);
            }
        };

        fetchRequest();
    }, [params.id]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        );
    }

    if (!request) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <h2 className="text-xl font-semibold mb-2">Request Not Found</h2>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                </Button>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "COMPLETED":
            case "APPROVED":
                return "text-green-600 bg-green-50 border-green-200";
            case "REJECTED":
                return "text-red-600 bg-red-50 border-red-200";
            case "ACCEPTED":
                return "text-blue-600 bg-blue-50 border-blue-200";
            default:
                return "text-yellow-600 bg-yellow-50 border-yellow-200";
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                            {request.request_type.replace(/_/g, " ")} Result
                        </h1>
                        <Badge variant="outline" className={getStatusColor(request.status)}>
                            {request.status}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Request ID: #{request.id} • Created on {format(new Date(request.created_at), "MMMM d, yyyy")}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Results and Images */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Clinical Analysis Result */}
                    {request.brain_tumor_result ? (
                        <Card className="border-l-4 border-l-blue-500 shadow-sm overflow-hidden">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Activity className="w-5 h-5" />
                                    <CardTitle>AI Analysis Report</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-gray-50 space-y-1">
                                        <p className="text-sm text-gray-500 font-medium">Detection Result</p>
                                        <p className={`text-xl font-bold ${request.brain_tumor_result.result_class === 'YES' ? 'text-red-600' : 'text-green-600'}`}>
                                            {request.brain_tumor_result.result_class === 'YES' ? 'Tumor Detected' : 'No Tumor Detected'}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-gray-50 space-y-1">
                                        <p className="text-sm text-gray-500 font-medium">AI Confidence Model</p>
                                        <div className="flex items-baseline gap-1">
                                            <p className="text-2xl font-bold text-gray-900">
                                                {(request.brain_tumor_result.confidence * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-gray-500 mb-3 block">Analyzed Medical Imaging</h4>
                                    <div className="relative rounded-xl overflow-hidden border bg-black/5 aspect-video flex items-center justify-center group">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={request.brain_tumor_result.image_url}
                                            alt="MRI Scan Analysis"
                                            className="w-full h-full object-contain"
                                        />
                                        <div className="absolute top-2 right-2">
                                            <Badge variant="secondary" className="bg-black/50 text-white hover:bg-black/60 backdrop-blur-md border-0">
                                                Processed
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="bg-gray-50 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
                                <Activity className="w-10 h-10 mb-3 opacity-20" />
                                <p className="font-medium">Analysis Pending</p>
                                <p className="text-sm mt-1">The lab technician has not yet processed the results for this request.</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Doctor's Review Section */}
                    {(request.doctor_comment || request.doctor_rating) && (
                        <Card className="shadow-sm">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <User className="w-5 h-5 text-gray-400" />
                                    <CardTitle>Doctor's Review</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {request.doctor_comment && (
                                    <div className="bg-yellow-50/50 p-4 rounded-lg border border-yellow-100">
                                        <p className="text-sm text-gray-900 leading-relaxed font-medium">
                                            "{request.doctor_comment}"
                                        </p>
                                    </div>
                                )}
                                {request.doctor_rating && (
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm text-gray-500">Rating:</p>
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <svg
                                                    key={i}
                                                    className={`w-4 h-4 ${i < (request.doctor_rating || 0)
                                                            ? "text-yellow-400 fill-yellow-400"
                                                            : "text-gray-200"
                                                        }`}
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                </svg>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Request Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 font-medium uppercase mb-1">Priority</p>
                                <Badge variant={request.priority === "URGENT" ? "destructive" : "secondary"}>
                                    {request.priority}
                                </Badge>
                            </div>

                            {request.notes && (
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase mb-1">Clinical Notes</p>
                                    <p className="text-sm text-gray-700">{request.notes}</p>
                                </div>
                            )}

                            <div className="pt-4 border-t space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Request Date</span>
                                    <span className="font-medium">{format(new Date(request.created_at), "MMM d, yyyy")}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">Last Updated</span>
                                    <span className="font-medium">{format(new Date(request.updated_at), "MMM d, yyyy")}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {request.appointment_time && (
                        <Card className="shadow-sm">
                            <CardContent className="p-4 flex items-start gap-4">
                                <div className="mt-1 bg-blue-50 p-2 rounded-lg text-blue-600">
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">Linked Appointment</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {format(new Date(request.appointment_time), "MMMM d, h:mm a")}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
