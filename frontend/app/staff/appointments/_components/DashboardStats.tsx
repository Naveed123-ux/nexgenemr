"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Stethoscope, Users } from "lucide-react";
import { useAppSelector } from "@/hooks/useStore";
import { fetchDashboardStats } from "@/store/slices/dashboardStatsSlice";
import { AppDispatch } from "@/store/store";

export function DashboardStats() {
    const dispatch = useDispatch<AppDispatch>();
    const dashboardStats = useAppSelector(state => state.dashboardStats);

    useEffect(() => {
        dispatch(fetchDashboardStats());
    }, [dispatch]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="py-0">
                <CardContent className="p-4">
                    <Calendar className="h-4 w-4 mb-2 text-blue-500" />
                    <h3 className="font-semibold text-sm">Today's Appointments</h3>
                    <p className="text-2xl font-bold">{dashboardStats.data?.appointments_today ?? '...'}</p>
                </CardContent>
            </Card>
            <Card className="py-0">
                <CardContent className="p-4">
                    <Users className="h-4 w-4 mb-2 text-purple-500" />
                    <h3 className="font-semibold text-sm">Total Patients</h3>
                    <p className="text-2xl font-bold">{dashboardStats.data?.total_patients ?? '...'}</p>
                </CardContent>
            </Card>
            <Card className="py-0">
                <CardContent className="p-4">
                    <Stethoscope className="h-4 w-4 mb-2 text-green-500" />
                    <h3 className="font-semibold text-sm">Available Doctors</h3>
                    <p className="text-2xl font-bold">{dashboardStats.data?.total_doctors ?? '...'}</p>
                </CardContent>
            </Card>
        </div>
    );
}