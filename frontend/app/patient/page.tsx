// FILE: app/patient/dashboard/page.tsx
"use client";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { fetchPatientDashboard } from "@/store/slices/patientDashboardSlice";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Calendar, Stethoscope, Pill, FlaskConical, AlertCircle, HeartPulse, Thermometer, Wind, Video, ExternalLink, Activity, Clock, User, MapPin, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Loading Component
const DashboardSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    </div>
);

// Main Dashboard Component
export default function PatientDashboardPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { data, status, error } = useSelector((state: RootState) => state.patientDashboard);

    useEffect(() => {
        dispatch(fetchPatientDashboard());
    }, [dispatch]);

    if (status === 'loading' || status === 'idle') {
        return <DashboardSkeleton />;
    }

    if (status === 'failed') {
        return (
            <div className="flex items-center justify-center h-full">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><AlertCircle className="text-destructive" /> Error</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Failed to load dashboard data: {error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Welcome Header */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-3 bg-gradient-to-br from-[#388fe5] to-[#6fb043] rounded-xl shadow-lg">
                        <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-[#388fe5] to-[#6fb043] bg-clip-text text-transparent">
                            Welcome back, {data?.first_name}!
                        </h1>
                        <p className="text-gray-600 mt-1">Here's your health overview</p>
                    </div>
                </div>
            </div>

            {/* Upcoming Appointments */}
            <Card className="shadow-lg border-2 border-gray-100">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
                                <CardDescription className="mt-1">
                                    {data?.upcoming_appointments?.length || 0} {data?.upcoming_appointments?.length === 1 ? 'appointment' : 'appointments'} scheduled
                                </CardDescription>
                            </div>
                        </div>
                        {data?.upcoming_appointments && data.upcoming_appointments.length > 0 && (
                            <Badge className="bg-blue-500 text-white">
                                {data.upcoming_appointments.length} Upcoming
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {data?.upcoming_appointments && data.upcoming_appointments.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {data.upcoming_appointments.map(appt => (
                                <Card key={appt.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-gray-100 hover:border-blue-300">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-2 bg-blue-500 rounded-lg">
                                                <User className="w-4 h-4 text-white" />
                                            </div>
                                            <CardTitle className="text-lg font-bold text-gray-900">{appt.doctor_name}</CardTitle>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {appt.is_telehealth ? (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 rounded-full">
                                                    <Video className="w-3.5 h-3.5 text-blue-600" />
                                                    <span className="text-xs font-medium text-blue-700">Telehealth</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full">
                                                    <MapPin className="w-3.5 h-3.5 text-[#388fe5]" />
                                                    <span className="text-xs font-medium text-green-700">In-Person</span>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3 pt-4">
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <Clock className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Date & Time</p>
                                                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                                    {format(new Date(appt.start_time), "PPP 'at' p")}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                                            <div className="p-2 bg-purple-100 rounded-lg">
                                                <Building2 className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Department</p>
                                                <p className="text-sm font-semibold text-gray-900 mt-0.5">{appt.department_name}</p>
                                            </div>
                                        </div>
                                        {appt.is_telehealth && appt.google_meet_link && (
                                            <Button asChild className="w-full bg-[#388fe5] hover:bg-[#6fb043] text-white">
                                                <a href={appt.google_meet_link} target="_blank" rel="noopener noreferrer">
                                                    <Video className="w-4 h-4 mr-2" />
                                                    Join Meeting
                                                    <ExternalLink className="w-3 h-3 ml-2" />
                                                </a>
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                                <Calendar className="h-10 w-10 text-blue-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Appointments</h3>
                            <p className="text-gray-500">You have no scheduled appointments at this time.</p>
                            <p className="text-sm text-gray-400 mt-2">Contact your healthcare provider to schedule an appointment</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Vitals */}
                <Card className="shadow-lg border-2 border-gray-100">
                    <CardHeader className="border-b">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500 rounded-lg">
                                <Activity className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Recent Vitals</CardTitle>
                                {data?.recent_vitals && <CardDescription className="mt-1">Recorded on {format(new Date(data.recent_vitals.recorded_at), 'PPP')}</CardDescription>}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {data?.recent_vitals ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border-2 border-red-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <HeartPulse className="w-5 h-5 text-red-600" />
                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Blood Pressure</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{data.recent_vitals.blood_pressure}</p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Stethoscope className="w-5 h-5 text-blue-600" />
                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Heart Rate</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{data.recent_vitals.heart_rate} <span className="text-sm text-gray-600">bpm</span></p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border-2 border-orange-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Thermometer className="w-5 h-5 text-orange-600" />
                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Temperature</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{data.recent_vitals.temperature} <span className="text-sm text-gray-600">°C</span></p>
                                </div>
                                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border-2 border-green-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Wind className="w-5 h-5 text-[#388fe5]" />
                                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Resp. Rate</span>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900">{data.recent_vitals.respiratory_rate} <span className="text-sm text-gray-600">/min</span></p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-3">
                                    <Activity className="h-8 w-8 text-red-500" />
                                </div>
                                <p className="text-gray-500 font-medium">No recent vitals recorded</p>
                                <p className="text-sm text-gray-400 mt-1">Your vitals will appear here once recorded</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Active Medications */}
                <Card className="shadow-lg border-2 border-gray-100">
                    <CardHeader className="border-b">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500 rounded-lg">
                                <Pill className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Active Medications</CardTitle>
                                <CardDescription className="mt-1">
                                    {data?.active_medications?.length || 0} active {data?.active_medications?.length === 1 ? 'prescription' : 'prescriptions'}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {data?.active_medications && data.active_medications.length > 0 ? (
                            <div className="space-y-3">
                                {data.active_medications.map(med => (
                                    <div key={med.id} className="p-4 bg-gradient-to-r from-green-50 to-white rounded-xl border-2 border-green-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-green-500 rounded-lg">
                                                <Pill className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900 text-lg">{med.medication_name}</p>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <Badge variant="outline" className="text-xs">{med.dosage}</Badge>
                                                    <Badge variant="outline" className="text-xs">{med.frequency}</Badge>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Started: {format(new Date(med.start_date), 'PPP')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                                    <Pill className="h-8 w-8 text-green-500" />
                                </div>
                                <p className="text-gray-500 font-medium">No active medications</p>
                                <p className="text-sm text-gray-400 mt-1">Your prescriptions will appear here</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Lab Results */}
            <Card className="shadow-lg border-2 border-gray-100">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500 rounded-lg">
                                <FlaskConical className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Recent Lab Results</CardTitle>
                                <CardDescription className="mt-1">
                                    {data?.recent_lab_results?.length || 0} recent {data?.recent_lab_results?.length === 1 ? 'result' : 'results'}
                                </CardDescription>
                            </div>
                        </div>
                        {data?.recent_lab_results && data.recent_lab_results.length > 0 && (
                            <Badge variant="outline" className="text-sm">
                                {data.recent_lab_results.length} Results
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {data?.recent_lab_results && data.recent_lab_results.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                                        <TableHead className="font-semibold text-gray-700 uppercase tracking-wider text-xs">Test Name</TableHead>
                                        <TableHead className="font-semibold text-gray-700 uppercase tracking-wider text-xs">Result</TableHead>
                                        <TableHead className="font-semibold text-gray-700 uppercase tracking-wider text-xs">Date Reported</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.recent_lab_results.map(lab => (
                                        <TableRow key={lab.id} className="hover:bg-purple-50 transition-colors">
                                            <TableCell className="font-semibold text-gray-900">{lab.test_name}</TableCell>
                                            <TableCell>
                                                <Badge className="bg-purple-500 text-white">{lab.result}</Badge>
                                            </TableCell>
                                            <TableCell className="text-gray-600">{format(new Date(lab.date_reported), 'PPP')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
                                <FlaskConical className="h-10 w-10 text-purple-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Lab Results</h3>
                            <p className="text-gray-500">No recent lab results are available.</p>
                            <p className="text-sm text-gray-400 mt-2">Your test results will appear here once available</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}