"use client";

import { useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderUp, Loader2, FileCheck, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";

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
        if (!file) return;

        setIsAnalyzing(true);

        // Simulate AI delay
        setTimeout(() => {
            setIsAnalyzing(false);
            // Mock AI Result
            setAnalysisResult({
                isValid: true,
                summary: "The specific gravity (1.005) is on the lower end, suggesting dilute urine. The pH (5.0) is slightly acidic but within the normal range. Leukocytes (70 Leu/uL) and Protein (15 mg/dL) are present at low levels, which could indicate a minor infection or be insignificant depending on clinical context.",
                confidence: 98.5,
                abnormalities: ["Low Specific Gravity", "Trace Protein"]
            });
            toast.success("AI Analysis Complete!");
        }, 2500);
    };

    const submitReport = () => {
        toast.success("Report submitted to doctor for review!");
        router.push("/lab-technician/requests");
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-2 text-gray-500 mb-4">
                <span className="cursor-pointer hover:text-gray-900" onClick={() => router.back()}>Requests</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">Upload Report</span>
            </div>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Upload Lab Report</h1>
                <p className="text-gray-500">Request ID: <span className="font-mono font-medium text-gray-700">#{requestId || "N/A"}</span></p>
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
                            <h3 className="text-lg font-semibold text-gray-900">Click to upload or drag and drop</h3>
                            <p className="text-sm text-gray-500 mt-2">PDF, PNG, JPG up to 10MB</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".pdf,.png,.jpg,.jpeg"
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
                                <Button variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => setFile(null)}>
                                    Remove
                                </Button>
                            </div>

                            {!analysisResult && (
                                <Button
                                    className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30 transition-all"
                                    onClick={analyzeWithAI}
                                    disabled={isAnalyzing}
                                >
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Analyzing Report Content...
                                        </>
                                    ) : (
                                        "Analyze with AI"
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
                            <FileCheck className="w-5 h-5" />
                            AI Analysis Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-white rounded-lg border border-green-100 shadow-sm">
                            <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                            <p className="text-gray-700 leading-relaxed">{analysisResult.summary}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 bg-white rounded-lg border border-red-100 shadow-sm">
                                <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Detected Abnormalities
                                </h4>
                                <ul className="list-disc list-inside text-red-700 space-y-1">
                                    {analysisResult.abnormalities.map((item: string, i: number) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="p-4 bg-white rounded-lg border border-blue-100 shadow-sm flex flex-col items-center justify-center">
                                <span className="text-sm text-gray-500">AI Confidence Score</span>
                                <div className="text-3xl font-bold text-blue-600">{analysisResult.confidence}%</div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                size="lg"
                                className="bg-green-600 hover:bg-green-700 text-white px-8"
                                onClick={submitReport}
                            >
                                Review & Submit to Doctor
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
