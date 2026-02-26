"use client";

import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";

import { fetchWeeklyAppointments } from "@/store/slices/appointmentSlice";
import { AllAppointmentsHistory } from "./_components/AllAppointmentsHistory";

// Import components from the new folder
import { CalendarSkeleton } from "./_components/CalendarSkeleton";
import { CustomWeekCalendar } from "./_components/CustomWeekCalendar";
import { AppDispatch, RootState } from "@/store/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UpcomingAppointments } from "./_components/UpcomingAppointments";
import { SwapAppointmentProvider } from "./_components/SwapAppointmentContext";
import { SwapModeBanner } from "./_components/SwapModeBanner";
import { Calendar, List, History as HistoryIcon, Clock } from "lucide-react";

// Helper function
const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const formatTime = (date: Date) => date.toTimeString().substring(0, 5);

export default function AppointmentsPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { weekly: calendarAppointments, weeklyStatus } = useSelector((state: RootState) => state.appointments);
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getMonday(new Date()));

    useEffect(() => {
        const startDate = format(currentWeekStart, "yyyy-MM-dd");
        dispatch(fetchWeeklyAppointments(startDate));
    }, [currentWeekStart, dispatch]);

    const formattedAppointments = useMemo(
        () => calendarAppointments.map((appt) => {
            const startDate = new Date(appt.start_time);
            return {
                ...appt,
                date: startDate,
                startTime: formatTime(startDate),
                endTime: formatTime(new Date(appt.end_time)),
                timeDisplay: `${formatTime(startDate)} - ${formatTime(new Date(appt.end_time))}`,
            };
        }),
        [calendarAppointments]
    );

    return (
        <SwapAppointmentProvider>
            <div className="p-4 md:p-6 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Scheduling</h1>
                        <p className="text-gray-500 mt-1">Manage your appointments and availability</p>
                    </div>
                </div>

                <SwapModeBanner />

                <Tabs defaultValue="upcoming" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 md:w-[400px] mb-8">
                        <TabsTrigger value="upcoming" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Upcoming
                        </TabsTrigger>
                        <TabsTrigger value="calendar" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Calendar
                        </TabsTrigger>
                        <TabsTrigger value="history" className="flex items-center gap-2">
                            <HistoryIcon className="h-4 w-4" />
                            History
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming" className="mt-0">
                        <UpcomingAppointments />
                    </TabsContent>

                    <TabsContent value="calendar" className="mt-0">
                        {weeklyStatus === 'loading' && calendarAppointments.length === 0 ? (
                            <CalendarSkeleton />
                        ) : (
                            <CustomWeekCalendar
                                appointments={formattedAppointments}
                                currentWeek={currentWeekStart}
                                setCurrentWeek={setCurrentWeekStart}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        <AllAppointmentsHistory />
                    </TabsContent>
                </Tabs>
            </div>
        </SwapAppointmentProvider>
    );
}