"use client";

import { useEffect, useState } from "react";
import { labRequestApi, PaginatedLabRequests, LabRequest } from "@/app/_apis/lab_requests";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, FileText, Calendar, User } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

export default function PatientLabResultsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<PaginatedLabRequests | null>(null);
    const [page, setPage] = useState(1);

    const fetchResults = async () => {
        setIsLoading(true);
        try {
            const response = await labRequestApi.listMyPatientRequests({
                page,
                size: 10,
            });
            setData(response);
        } catch (error) {
            console.error("Failed to fetch lab results:", error);
            toast.error("Failed to load lab results");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchResults();
    }, [page]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "COMPLETED":
            case "APPROVED":
                return "bg-green-100 text-green-800 border-green-200";
            case "REJECTED":
                return "bg-red-100 text-red-800 border-red-200";
            case "ACCEPTED":
                return "bg-blue-100 text-blue-800 border-blue-200";
            default:
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lab Results</h1>
                <p className="text-muted-foreground">
                    View and manage your laboratory test requests and reports.
                </p>
            </div>

            {isLoading && !data ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : data?.items.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="rounded-full bg-gray-100 p-3 mb-4">
                            <FileText className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No lab results found</h3>
                        <p className="text-gray-500 max-w-sm mt-2">
                            You don't have any lab requests or results yet. Any tests ordered by your doctor will appear here.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {data?.items.map((request) => (
                        <Card key={request.id} className="transition-all hover:shadow-md">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-semibold text-lg text-gray-900">
                                                {request.request_type.replace(/_/g, " ")}
                                            </h3>
                                            <Badge variant="outline" className={getStatusColor(request.status)}>
                                                {request.status}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-4 h-4" />
                                                <span>{format(new Date(request.created_at), "MMM d, yyyy")}</span>
                                            </div>
                                            {request.doctor_rating && (
                                                <div className="flex items-center gap-1">
                                                    <User className="w-4 h-4" />
                                                    <span>Dr. Review: {request.doctor_rating}/5</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/patient/lab-results/${request.id}`}>
                                                <Eye className="w-4 h-4 mr-2" />
                                                View Details
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
