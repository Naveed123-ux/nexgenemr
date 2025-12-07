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
import { SwapAppointmentProvider } from "./_components/SwapAppointmentContext";
import { SwapModeBanner } from "./_components/SwapModeBanner";

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
                <h1 className="text-3xl font-bold text-gray-900">Scheduling</h1>
                
                <SwapModeBanner />
                
                {weeklyStatus === 'loading' && calendarAppointments.length === 0 ? (
                    <CalendarSkeleton />
                ) : (
                    <CustomWeekCalendar
                        appointments={formattedAppointments}
                        currentWeek={currentWeekStart}
                        setCurrentWeek={setCurrentWeekStart}
                    />
                )}
                
                <AllAppointmentsHistory />
            </div>
        </SwapAppointmentProvider>
    );
}