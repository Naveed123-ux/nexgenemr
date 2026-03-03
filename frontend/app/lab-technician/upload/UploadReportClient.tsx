"use client";

import { useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderUp, Loader2, FileCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { labRequestApi } from "@/app/_apis/lab_requests";

export default function UploadReportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestId = searchParams.get("id");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setAnalysisResult(null); // Reset prev results
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const analyzeWithAI = async () => {
        if (!file || !requestId) return;

        setIsAnalyzing(true);
        try {
            const response = await labRequestApi.processRequest(parseInt(requestId), file);
            setAnalysisResult(response.brain_tumor_result);
            toast.success("AI Analysis Complete!");
        } catch (error) {
            console.error("AI Analysis failed:", error);
            toast.error("AI Analysis failed. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const submitReport = () => {
        toast.success("Report submitted successfully!");
        router.push("/lab-technician/requests");
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-2 text-gray-500 mb-4">
                <span className="cursor-pointer hover:text-gray-900" onClick={() => router.push('/lab-technician/requests')}>Requests</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Process Request</span>
            </div>

            {/* Empty State for no Request ID */}
            {!requestId ? (
                <Card className="border-dashed border-2 p-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-gray-900">No Request Selected</h2>
                            <p className="text-gray-500 max-w-md mx-auto">
                                You must select a lab request to process before uploading an image.
                                Please go back to the requests list and select a pending or accepted request.
                            </p>
                        </div>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white mt-4"
                            onClick={() => router.push('/lab-technician/requests')}
                        >
                            Back to Requests
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Process Lab Request</h1>
                        <p className="text-gray-500">Processing Request ID: <span className="font-mono font-medium text-gray-700">#{requestId}</span></p>
                    </div>

                    <Card>
                        <CardContent className="p-6">
                            {!file ? (
                                <div
                                    className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                        <FolderUp className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Click to upload image for AI analysis</h3>
                                    <p className="text-sm text-gray-500 mt-2">PNG, JPG up to 10MB</p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept=".png,.jpg,.jpeg"
                                        onChange={handleFileChange}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white border rounded-lg flex items-center justify-center">
                                                <FileCheck className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{file.name}</p>
                                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                        {!analysisResult && (
                                            <Button variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setFile(null)}>
                                                Remove
                                            </Button>
                                        )}
                                    </div>

                                    {!analysisResult && (
                                        <Button
                                            className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 transition-all font-semibold"
                                            onClick={analyzeWithAI}
                                            disabled={isAnalyzing}
                                        >
                                            {isAnalyzing ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                    Running AI Detection...
                                                </>
                                            ) : (
                                                "Trigger AI Detection"
                                            )}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {analysisResult && (
                        <Card className="border-green-100 bg-green-50/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-800">
                                    <CheckCircle2 className="w-5 h-5" />
                                    AI Detection Results
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white rounded-lg border shadow-sm">
                                        <h4 className="font-semibold text-gray-900 mb-2">Detection Result</h4>
                                        <div className={`text-2xl font-bold ${analysisResult.result_class === 'YES' ? 'text-red-600' : 'text-green-600'}`}>
                                            {analysisResult.result_class === 'YES' ? 'Positive (Tumor Detected)' : 'Negative (No Tumor Detected)'}
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white rounded-lg border shadow-sm flex flex-col items-center justify-center">
                                        <span className="text-sm text-gray-500">AI Confidence Score</span>
                                        <div className="text-3xl font-bold text-blue-600">{(analysisResult.confidence * 100).toFixed(2)}%</div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button
                                        size="lg"
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-semibold"
                                        onClick={submitReport}
                                    >
                                        Submit for Doctor Review
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
