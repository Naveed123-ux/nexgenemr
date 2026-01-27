"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, FlaskConical, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { labRequestApi, LabRequest } from "@/app/_apis/lab_requests";

export default function LabTechReportViewPage() {
    const { id } = useParams();
    const router = useRouter();
    const [request, setRequest] = useState<LabRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const data = await labRequestApi.getRequestById(parseInt(id as string));
                setRequest(data);
            } catch (error) {
                console.error("Failed to fetch lab request:", error);
                toast.error("Failed to load lab report");
            } finally {
                setIsLoading(false);
            }
        };
        fetchRequest();
    }, [id]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-gray-500 font-medium">Loading report details...</p>
            </div>
        );
    }

    if (!request) return <div>Request not found</div>;

    const result = request.brain_tumor_result;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Requests
            </Button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Lab Result Details</h1>
                    <p className="text-gray-500 mt-1">Request ID: #{request.id} • Type: {request.request_type}</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="text-sm px-4 py-1 h-fit bg-blue-50 text-blue-700">
                        Priority: {request.priority}
                    </Badge>
                    <Badge variant="secondary" className="text-sm px-4 py-1 h-fit">
                        Status: {request.status}
                    </Badge>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 overflow-hidden border-2 shadow-lg">
                    <CardHeader className="bg-gray-50">
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <FlaskConical className="w-5 h-5" />
                            Processed AI Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {result ? (
                            <div className="flex flex-col md:flex-row">
                                <div className="md:w-1/2 p-6 bg-gray-900 flex items-center justify-center min-h-[400px]">
                                    <img
                                        src={result.image_url.startsWith('http') ? result.image_url : `http://localhost:8000/static/${result.image_url}`}
                                        alt="MRI Analysis"
                                        className="max-w-full max-h-full object-contain rounded"
                                    />
                                </div>
                                <div className="md:w-1/2 p-8 space-y-8 bg-white">
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Detection Output</p>
                                        <div className={`text-4xl font-black ${result.result_class === 'YES' ? 'text-red-600' : 'text-green-600'}`}>
                                            {result.result_class === 'YES' ? 'POSITIVE' : 'NEGATIVE'}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">AI Confidence Score</p>
                                        <div className="text-3xl font-bold text-blue-600">
                                            {(result.confidence * 100).toFixed(2)}%
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t font-medium text-gray-500 text-sm">
                                        Processed on {new Date(result.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-20 text-center text-gray-500">
                                No result findings found.
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {request.status === 'APPROVED' && (
                        <Card className="bg-green-50 border-green-200 border-2">
                            <CardContent className="p-6 text-center space-y-3">
                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-7 h-7" />
                                </div>
                                <h3 className="font-bold text-green-900">Physician Approved</h3>
                                <p className="text-sm text-green-700">
                                    This report has been reviewed and signed off by the requesting doctor.
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wider text-gray-500">Requesting Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-gray-500">Doctor Notes</Label>
                                <p className="text-sm mt-1 bg-gray-50 p-3 rounded border italic">
                                    "{request.notes || "N/A"}"
                                </p>
                            </div>
                            {request.doctor_comment && (
                                <div>
                                    <Label className="text-gray-500">Doctor's Feedback</Label>
                                    <p className="text-sm mt-1 bg-blue-50 p-3 rounded border border-blue-100">
                                        "{request.doctor_comment}"
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
