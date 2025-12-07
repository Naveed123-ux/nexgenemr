"use client";

import { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { formatInTimeZone } from "date-fns-tz";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as Cal } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Notebook, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { InfinitySpin } from "react-loader-spinner";
import { getAllAppointments } from "@/app/_apis/staff/receptionist";
import { selectSingleAppointment } from "@/store/slices/AllStaff";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Appointment } from "./types";
import { AppDispatch } from "@/store/store";

export function TodaysAppointmentsView() {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();

    const getTodayString = () => formatInTimeZone(new Date(), "Asia/Karachi", "yyyy-MM-dd");

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [statusFilter, setStatusFilter] = useState("AllStatus");
    const [date, setDate] = useState<string>(getTodayString());
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadAppointments = async () => {
            setLoading(true);
            try {
                const response = await getAllAppointments(currentPage, date, search);
                setAppointments(response?.appointments || []);
                setTotalPages(response?.totalPages || 1);
            } catch (error) {
                toast.error("Failed to load appointments");
            } finally {
                setLoading(false);
            }
        };
        loadAppointments();
    }, [date, search, currentPage]);

    const filteredAppointments = useMemo(() => {
        if (statusFilter === "AllStatus") return appointments;
        return appointments.filter(appt => appt.status === statusFilter);
    }, [appointments, statusFilter]);

    const formatAppointmentTimes = (start: string, end: string) => {
        const startTime = new Date(start).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Karachi" });
        const duration = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
        return `${startTime} (${duration} min)`;
    };

    const addVitals = (appt: Appointment) => {
        dispatch(selectSingleAppointment(appt));
        router.push("/staff/addVitals");
    };

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                    <Input placeholder="Search patients or doctors..." className="max-w-xs" value={search} onChange={e => setSearch(e.target.value)} />
                    <div className="flex gap-4">
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className="w-48 justify-start font-normal">{date}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Cal mode="single" selected={new Date(date)} onSelect={d => d && setDate(formatInTimeZone(d, "Asia/Karachi", "yyyy-MM-dd"))} /></PopoverContent>
                        </Popover>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="AllStatus">All Status</SelectItem>
                                <SelectItem value="Confirmed">Confirmed</SelectItem>
                                <SelectItem value="Checked In">Checked In</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500" />Completed: {appointments.filter(a => a.status === "Completed").length}</span>
                    <span className="flex items-center"><XCircle className="h-4 w-4 mr-2 text-red-500" />Cancelled: {appointments.filter(a => a.status === "Cancelled").length}</span>
                </div>
                {loading ? (
                    <div className="flex justify-center py-10"><InfinitySpin width="200" color="#388fe5" /></div>
                ) : filteredAppointments.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">No appointments found for this criteria.</div>
                ) : (
                    <div className="space-y-4">
                        {filteredAppointments.map(appt => (
                            <Card key={appt.id} className="p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        <span className="font-semibold">{appt.patient_name}</span>
                                        <Badge variant={appt.is_telehealth ? "destructive" : "default"}>{appt.is_telehealth ? "Online" : "Physical"}</Badge>
                                    </div>
                                    <Badge variant="outline">{appt.status}</Badge>
                                </div>
                                <div className="flex items-center space-x-4 mb-2 text-sm text-gray-600">
                                    <span className="flex items-center"><Clock className="h-4 w-4 mr-2" />{formatAppointmentTimes(appt.start_time, appt.end_time)}</span>
                                    <span className="flex items-center"><User className="h-4 w-4 mr-2" />{appt.doctor_name}</span>
                                </div>
                                <div className="p-2 rounded-md bg-blue-50 text-blue-800 text-sm mb-3">
                                    <div className="flex items-center"><Notebook className="h-4 w-4 mr-2" />Reason: {appt.reason_for_visit}</div>
                                </div>
                                <Button className="bg-green-primary" size="sm" onClick={() => addVitals(appt)}>Add Vitals</Button>
                            </Card>
                        ))}
                        <div className="flex justify-between items-center mt-4">
                            <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeft /></Button>
                                <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}><ChevronRight /></Button>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}