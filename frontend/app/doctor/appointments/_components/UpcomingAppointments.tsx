"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, TrendingUp } from "lucide-react";

import { fetchUpcomingAppointments } from "@/store/slices/appointmentSlice";
import { AppointmentCard } from "./AppointmentCard";
import { AppDispatch, RootState } from "@/store/store";

export const UpcomingAppointments = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { upcoming: appointments, upcomingStatus: status } = useSelector((state: RootState) => state.appointments);

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchUpcomingAppointments());
        }
    }, [status, dispatch]);

    if (status === 'loading') {
        return (
            <Card className="shadow-lg border-2 border-gray-100">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
                                <CardDescription>Your scheduled appointments</CardDescription>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (appointments.length === 0 && status === 'succeeded') {
        return (
            <Card className="shadow-lg border-2 border-gray-100">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500 rounded-lg">
                                <Calendar className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
                                <CardDescription>Your scheduled appointments</CardDescription>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-sm">0 Appointments</Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                            <Calendar className="h-10 w-10 text-blue-500" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Upcoming Appointments</h3>
                        <p className="text-gray-500">You have no scheduled appointments at this time.</p>
                        <p className="text-sm text-gray-400 mt-2">New appointments will appear here</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg border-2 border-gray-100">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                            <Calendar className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Upcoming Appointments</CardTitle>
                            <CardDescription>
                                {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'} scheduled
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge className="bg-blue-500 text-white">
                            {appointments.length} Upcoming
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {appointments.map((appt) => <AppointmentCard key={appt.id} appointment={appt} />)}
                </div>
            </CardContent>
        </Card>
    );
};