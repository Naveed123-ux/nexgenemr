"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle2, XCircle, ArrowLeft, Loader2, FlaskConical, AlertTriangle } from "lucide-react";
import { toast } from "react-hot-toast";
import { labRequestApi, LabRequest } from "@/app/_apis/lab_requests";

export default function LabReportReviewPage() {
    const { id } = useParams();
    const router = useRouter();
    const [request, setRequest] = useState<LabRequest | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [comment, setComment] = useState("");
    const [rating, setRating] = useState(5);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const data = await labRequestApi.getRequestById(parseInt(id as string));
                setRequest(data);
                setComment(data.doctor_comment || "");
                setRating(data.doctor_rating || 5);
            } catch (error) {
                console.error("Failed to fetch lab request:", error);
                toast.error("Failed to load lab report");
            } finally {
                setIsLoading(false);
            }
        };
        fetchRequest();
    }, [id]);

    const handleReview = async (approved: boolean) => {
        setIsSubmitting(true);
        try {
            await labRequestApi.reviewRequest(parseInt(id as string), {
                comment,
                rating,
                approved
            });
            toast.success(approved ? "Report Approved!" : "Report Rejected");
            router.push("/doctor/appointments");
        } catch (error) {
            console.error("Review failed:", error);
            toast.error("Failed to submit review");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-gray-500 font-medium">Loading clinical findings...</p>
            </div>
        );
    }

    if (!request) return <div>Request not found</div>;

    const result = request.brain_tumor_result;

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <Button variant="ghost" onClick={() => router.back()} className="mb-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Lab Report Review</h1>
                    <p className="text-gray-500 mt-1">Request ID: #{request.id} • Type: {request.request_type}</p>
                </div>
                <Badge variant={request.status === 'COMPLETED' ? 'outline' : 'secondary'} className="text-sm px-4 py-1 h-fit">
                    Status: {request.status}
                </Badge>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Left: AI Result Visualization */}
                <Card className="lg:col-span-2 overflow-hidden border-2 border-blue-50 shadow-lg">
                    <CardHeader className="bg-blue-50/50">
                        <CardTitle className="flex items-center gap-2 text-blue-900">
                            <FlaskConical className="w-5 h-5" />
                            AI Analysis Findings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {result ? (
                            <div className="flex flex-col md:flex-row">
                                <div className="md:w-1/2 p-6 bg-gray-900 flex items-center justify-center min-h-[400px]">
                                    <img
                                        src={result.image_url.startsWith('http') ? result.image_url : `http://localhost:8000/static/${result.image_url}`}
                                        alt="MRI Analysis"
                                        className="max-w-full max-h-full object-contain rounded shadow-2xl"
                                    />
                                </div>
                                <div className="md:w-1/2 p-8 space-y-8">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">AI Classification</Label>
                                        <div className={`text-4xl font-black ${result.result_class === 'YES' ? 'text-red-600' : 'text-green-600'}`}>
                                            {result.result_class === 'YES' ? 'TUMOR DETECTED' : 'NO TUMOR'}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-gray-500">Confidence Score</Label>
                                        <div className="relative pt-1">
                                            <div className="flex mb-2 items-center justify-between">
                                                <div>
                                                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                                                        {(result.confidence * 100).toFixed(1)}% Confidence
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-100">
                                                <div style={{ width: `${result.confidence * 100}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-1000"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex gap-3 text-amber-800">
                                        <AlertTriangle className="w-5 h-5 shrink-0" />
                                        <p className="text-sm">
                                            This AI result is for clinical assistance only. Final diagnosis must be confirmed by a licensed medical professional.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-20 text-center text-gray-500">
                                No result image found.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Right: Review Actions */}
                <div className="space-y-6">
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Clinical Review</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="rating">Result Reliability Rating</Label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`w-8 h-8 cursor-pointer transition-colors ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                            onClick={() => setRating(star)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="comment">Clinical Remarks</Label>
                                <Textarea
                                    id="comment"
                                    placeholder="Add your clinical observations and confirmation for the patient record..."
                                    className="min-h-[150px]"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <Button
                                    variant="outline"
                                    className="h-12 border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() => handleReview(false)}
                                    disabled={isSubmitting}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                </Button>
                                <Button
                                    className="h-12 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                                    onClick={() => handleReview(true)}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                    Approve & Sign
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gray-50 border-dashed border-2">
                        <CardContent className="p-4">
                            <h4 className="font-semibold text-gray-900 text-sm mb-2">Original Request Notes</h4>
                            <p className="text-gray-600 text-sm italic">
                                "{request.notes || "No notes provided."}"
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
