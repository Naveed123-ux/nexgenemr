// app/doctor/clinical-records/_components/ClinicalRecordsList.tsx

"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";
import { toast } from "sonner";
import { AppDispatch, RootState } from "@/store/store";
import { fetchAllAppointments } from "@/store/slices/appointmentSlice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Search, Calendar, User, Clock, FileText, Activity } from "lucide-react";
import { ManageClinicalRecordsModal } from "./ManageClinicalRecordsModal";
import { Appointment } from "@/store/slices/appointmentSlice";

export const ClinicalRecordsList = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { all: appointments, allStatus: status } = useSelector((state: RootState) => state.appointments);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchAllAppointments());
        }
    }, [status, dispatch]);

    const handleOpenModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedAppointment(null);
    };

    // Filter appointments based on search and status
    const filteredAppointments = appointments.filter(appt => {
        const matchesSearch = appt.patient_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || appt.status.toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    });

    // Get status badge color
    const getStatusBadge = (status: string) => {
        const statusLower = status.toLowerCase();
        if (statusLower === 'completed') return <Badge className="bg-[#388fe5] text-white">Completed</Badge>;
        if (statusLower === 'scheduled') return <Badge className="bg-teal-500 text-white">Scheduled</Badge>;
        if (statusLower === 'cancelled') return <Badge className="bg-red-500 text-white">Cancelled</Badge>;
        if (statusLower === 'no-show') return <Badge className="bg-gray-500 text-white">No Show</Badge>;
        return <Badge variant="outline">{status}</Badge>;
    };

    const renderContent = () => {
        if (status === 'loading') {
            return (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-48 w-full rounded-xl" />
                    ))}
                </div>
            );
        }

        if (filteredAppointments.length === 0 && status === 'succeeded') {
            return (
                <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                        <FileText className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Appointments Found</h3>
                    <p className="text-gray-500">
                        {searchQuery || statusFilter !== "all"
                            ? "No appointments match your search criteria."
                            : "No appointments available."}
                    </p>
                </div>
            );
        }

        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredAppointments.map((appt) => (
                    <Card key={appt.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-gray-100 hover:border-[#388fe5]">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-[#388fe5] rounded-lg">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-gray-900">{appt.patient_name}</CardTitle>
                                </div>
                                {getStatusBadge(appt.status)}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-4">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="p-2 bg-teal-100 rounded-lg">
                                    <Calendar className="w-4 h-4 text-teal-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Date</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                        {format(new Date(appt.start_time), "LLL dd, yyyy")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="p-2 bg-emerald-100 rounded-lg">
                                    <Clock className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Time</p>
                                    <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                        {format(new Date(appt.start_time), "p")}
                                    </p>
                                </div>
                            </div>
                            <Button
                                className="w-full bg-[#388fe5] hover:bg-[#6fb043] text-white"
                                onClick={() => handleOpenModal(appt)}
                            >
                                <Stethoscope className="h-4 w-4 mr-2" />
                                Manage Clinical Records
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    };

    return (
        <>
            <Card className="shadow-lg border-2 border-gray-100">
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#388fe5] rounded-lg">
                                <Activity className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Patient Appointments</CardTitle>
                                <CardDescription className="mt-1">
                                    {filteredAppointments.length} {filteredAppointments.length === 1 ? 'appointment' : 'appointments'} found
                                </CardDescription>
                            </div>
                        </div>
                        <Badge className="bg-[#388fe5] text-white">
                            {appointments.length} Total
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {/* Search and Filter */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Search by patient name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={statusFilter === "all" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setStatusFilter("all")}
                            >
                                All
                            </Button>
                            <Button
                                variant={statusFilter === "scheduled" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setStatusFilter("scheduled")}
                                className={statusFilter === "scheduled" ? "bg-teal-500" : ""}
                            >
                                Scheduled
                            </Button>
                            <Button
                                variant={statusFilter === "completed" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setStatusFilter("completed")}
                                className={statusFilter === "completed" ? "bg-[#388fe5]" : ""}
                            >
                                Completed
                            </Button>
                        </div>
                    </div>

                    {renderContent()}
                </CardContent>
            </Card>

            {selectedAppointment && (
                <ManageClinicalRecordsModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    appointment={selectedAppointment}
                />
            )}
        </>
    );
};