"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardStats } from "./_components/DashboardStats";
import { TodaysAppointmentsView } from "./_components/TodaysAppointmentsView";
import { ScheduleAppointmentView } from "./_components/ScheduleAppointmentView";

const TABS = ["Today's Dashboard", "Schedule Appointment"];

export default function AppointmentsDashboardPage() {
    const [activeTab, setActiveTab] = useState(TABS[0]);

    return (
        <div className="min-h-screen bg-gray-50 sm:p-6 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold">Appointments & Scheduling</h1>
                    <Button asChild className="bg-green-primary">
                        <Link href={"/staff/patientIntake"}>+ New Patient</Link>
                    </Button>
                </div>

                <DashboardStats />

                {/* Tab Navigation */}
                <div className="mb-6">
                    <div className="sm:hidden">
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value)}
                            className="w-full p-2 rounded-md border bg-white"
                        >
                            {TABS.map(tab => <option key={tab} value={tab}>{tab}</option>)}
                        </select>
                    </div>
                    <div className="hidden sm:block bg-gray-200 rounded-lg p-1">
                        {TABS.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                                    activeTab === tab ? "bg-[#7ed957] text-black" : "text-black hover:bg-gray-300"
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div>
                    {activeTab === "Today's Dashboard" && <TodaysAppointmentsView />}
                    {activeTab === "Schedule Appointment" && <ScheduleAppointmentView />}
                </div>
            </div>
        </div>
    );
}