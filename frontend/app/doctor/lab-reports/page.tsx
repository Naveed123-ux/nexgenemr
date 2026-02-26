"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    User,
    Calendar,
    FlaskConical,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    FileText,
    Clock,
    Plus,
    CalendarIcon,
    History,
    Check,
    X,
    Eye,
    Star,
    ImageIcon,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    ClipboardList,
    Beaker
} from "lucide-react";


import { format } from "date-fns";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { getMyPatients } from "@/app/_apis/doctor/appointments";
import { privateApi } from "@/lib/axios";
import {
    labRequestApi,
    LabRequest,
    PaginatedLabRequests
} from "@/app/_apis/lab_requests";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
// Removed Slider and Tooltip imports due to missing files


import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Patient {
    patient_profile_id: number;
    user_id: number;
    patient_name: string;
    email: string;
}

interface Appointment {
    id: number;
    patient_profile_id: number;
    doctor_user_id: number;
    start_time: string;
    end_time: string;
    status: string;
    reason_for_visit: string;
    doctor_name: string;
    lab_requests?: {
        id: number;
        request_type: string;
        status: string;
        priority: string;
    }[];
}



export default function LabReportsPage() {
    const doctor = useSelector((state: RootState) => state.auth);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(false);
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    // Request Modal State
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [reportType, setReportType] = useState("BRAIN_TUMOR");
    const [priority, setPriority] = useState("NORMAL");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // My Requests Tab State
    const [labRequests, setLabRequests] = useState<LabRequest[]>([]);
    const [loadingRequests, setLoadingRequests] = useState(false);
    const [requestPage, setRequestPage] = useState(1);
    const [requestTotalPages, setRequestTotalPages] = useState(1);
    const [requestStatusFilter, setRequestStatusFilter] = useState<string>("ALL");
    const [totalPages, setTotalPages] = useState(0);

    // Review Modal State
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [viewingRequest, setViewingRequest] = useState<LabRequest | null>(null);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewSubmitting, setReviewSubmitting] = useState(false);

    useEffect(() => {
        loadPatients();
        fetchLabRequests();
    }, [requestPage, requestStatusFilter]);

    const fetchLabRequests = async () => {
        try {
            setLoadingRequests(true);
            const data = await labRequestApi.listMyRequests({
                page: requestPage,
                size: 10,
                status: requestStatusFilter === "ALL" ? undefined : requestStatusFilter
            });
            setLabRequests(data.items);
            setRequestTotalPages(data.totalPages);
        } catch (error) {
            console.error("Error fetching lab requests:", error);
            toast.error("Failed to load lab requests");
        } finally {
            setLoadingRequests(false);
        }
    };


    const loadPatients = async () => {
        try {
            setLoadingPatients(true);
            const data = await getMyPatients();
            // Adjust data mapping based on actual API response
            const mapped = data.map((p: any) => ({
                patient_profile_id: p.patient_profile_id,
                user_id: p.patientID,
                patient_name: p.patient_name,
                email: p.email || "No email provided"
            }));

            setPatients(mapped);
        } catch (error) {
            console.error("Failed to load patients", error);
            toast.error("Failed to load patients");
        } finally {
            setLoadingPatients(false);
        }
    };

    const filteredPatients = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return patients.filter(p =>
            p.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [patients, searchQuery]);

    const handleSelectPatient = async (patient: Patient) => {
        setSelectedPatient(patient);
        setSearchQuery(patient.patient_name);
        setShowSearchDropdown(false);
        loadPatientAppointments(patient.patient_profile_id);
    };

    const loadPatientAppointments = async (profileId: number) => {
        try {
            setLoadingAppointments(true);
            const response = await privateApi.get(`/appointments/patient/${profileId}/appointments?include_past=true`);
            setAppointments(response.data);
        } catch (error) {
            console.error("Failed to load appointments", error);
            toast.error("Failed to load patient appointments");
        } finally {
            setLoadingAppointments(false);
        }
    };


    const handleOpenRequestModal = (appointment: Appointment) => {
        setSelectedAppointment(appointment);
        setIsRequestModalOpen(true);
    };

    const handleSubmitRequest = async () => {
        if (!selectedPatient || !selectedAppointment) return;

        try {
            setSubmitting(true);
            await labRequestApi.createRequest({
                patient_id: selectedPatient.user_id,
                request_type: reportType,
                appointment_id: selectedAppointment.id,
                notes: notes,
                priority: priority
            });
            toast.success("Lab report requested successfully");
            setIsRequestModalOpen(false);
            setNotes("");
            setPriority("NORMAL");
            // Refresh requests list
            fetchLabRequests();
            // Refresh appointments
            loadPatientAppointments(selectedPatient.patient_profile_id);
        } catch (error) {
            console.error("Failed to request lab report", error);
            toast.error("Failed to request lab report");
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenReviewModal = (request: LabRequest) => {
        setViewingRequest(request);
        setReviewComment(request.doctor_comment || "");
        setReviewRating(request.doctor_rating || 5);
        setIsReviewModalOpen(true);
    };


    const handleSubmitReview = async (approved: boolean) => {
        if (!viewingRequest) return;

        try {
            setReviewSubmitting(true);
            await labRequestApi.reviewRequest(viewingRequest.id, {
                comment: reviewComment,
                rating: reviewRating,
                approved: approved
            });
            toast.success(`Lab report ${approved ? 'approved' : 'rejected'} successfully`);
            setIsReviewModalOpen(false);
            fetchLabRequests();
            // Also refresh appointments to update status badges
            if (selectedPatient) {
                loadPatientAppointments(selectedPatient.patient_profile_id);
            }
        } catch (error) {
            console.error("Failed to review lab report", error);
            toast.error("Failed to submit review");
        } finally {
            setReviewSubmitting(false);
        }
    };


    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <FlaskConical className="w-8 h-8 text-[#388fe5]" />
                        Lab Reports
                    </h1>
                    <p className="text-gray-500 mt-1">Search for a patient and request lab investigations</p>
                </div>
            </div>

            <Tabs defaultValue="request" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
                    <TabsTrigger value="request" className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Request New Lab
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        My Lab Requests
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="request" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left Column: Patient Search */}
                        <Card className="lg:col-span-1 border-none shadow-md bg-white">
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <User className="w-5 h-5 text-gray-400" />
                                    Patient Selection
                                </CardTitle>
                                <CardDescription>Search for a patient to view their appointments</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <Input
                                            placeholder="Search name or ID..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setShowSearchDropdown(true);
                                            }}
                                            onFocus={() => setShowSearchDropdown(true)}
                                            className="pl-10 h-11 border-gray-200 focus:border-[#388fe5] focus:ring-[#388fe5]/10"
                                        />
                                    </div>

                                    {showSearchDropdown && filteredPatients.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-[300px] overflow-y-auto overflow-x-hidden p-2 animate-in fade-in zoom-in duration-200">
                                            {filteredPatients.map((patient) => (
                                                <button
                                                    key={patient.patient_profile_id}
                                                    onClick={() => handleSelectPatient(patient)}
                                                    className="w-full flex flex-col items-start p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <span className="font-semibold text-gray-900">{patient.patient_name}</span>
                                                    <span className="text-xs text-gray-500">{patient.email}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {selectedPatient && (
                                    <div className="mt-6 p-4 rounded-xl bg-[#388fe5]/5 border border-[#388fe5]/10 border-dashed">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-[#388fe5] flex items-center justify-center text-white text-xl font-bold">
                                                {selectedPatient.patient_name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{selectedPatient.patient_name}</p>
                                                <p className="text-sm text-gray-500 truncate">{selectedPatient.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Right Column: Appointments */}
                        <Card className="lg:col-span-2 border-none shadow-md bg-white min-h-[500px]">
                            <CardHeader>
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    Patient Appointments
                                </CardTitle>
                                <CardDescription>
                                    {selectedPatient
                                        ? `Appointments for ${selectedPatient.patient_name}`
                                        : "Select a patient to see their clinical visits"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {!selectedPatient ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                            <Search className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <div className="max-w-[280px]">
                                            <p className="text-gray-400 font-medium">No patient selected</p>
                                            <p className="text-gray-400 text-sm">Search and select a patient from the left to view their appointment history.</p>
                                        </div>
                                    </div>
                                ) : loadingAppointments ? (
                                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                        <Loader2 className="w-10 h-10 text-[#388fe5] animate-spin" />
                                        <p className="text-gray-500">Fetching appointments...</p>
                                    </div>
                                ) : appointments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                            <CalendarIcon className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <div className="max-w-[280px]">
                                            <p className="text-gray-400 font-medium">No appointments found</p>
                                            <p className="text-gray-400 text-sm">This patient doesn&apos;t have any recorded appointments.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {appointments.map((appointment) => (
                                            <div
                                                key={appointment.id}
                                                className="group relative flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-[#388fe5]/30 hover:bg-white hover:shadow-lg transition-all"
                                            >
                                                <div className="flex items-start gap-4">
                                                    <div className="mt-1 p-2 bg-white rounded-lg border border-gray-100 text-[#388fe5]">
                                                        <Clock className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-gray-900">
                                                                {format(new Date(appointment.start_time), "PPP")}
                                                            </p>
                                                            <Badge variant="secondary" className="bg-white text-xs font-normal">
                                                                {format(new Date(appointment.start_time), "p")}
                                                            </Badge>
                                                            {appointment.doctor_user_id === doctor.id ? (
                                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                                                                    Your Appointment
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="border-gray-200 text-gray-500 font-normal">
                                                                    {appointment.doctor_name}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                                                            Reason: <span className="text-gray-700 italic">"{appointment.reason_for_visit}"</span>
                                                        </p>
                                                        <div className="flex items-center gap-4 mt-2">
                                                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                                {appointment.status}
                                                            </div>
                                                            {appointment.lab_requests && appointment.lab_requests.length > 0 && (
                                                                <div className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                                                    Lab: {appointment.lab_requests[0].status}
                                                                </div>
                                                            )}
                                                            <div className="text-xs text-gray-400">
                                                                ID: #{appointment.id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 flex justify-end">
                                                    <Button
                                                        onClick={() => handleOpenRequestModal(appointment)}
                                                        className="bg-[#388fe5] hover:bg-[#2d7ad1] text-white rounded-lg px-6 gap-2"
                                                        disabled={
                                                            appointment.doctor_user_id !== doctor.id ||
                                                            (appointment.lab_requests && appointment.lab_requests.some(l => l.status !== 'REJECTED'))
                                                        }
                                                        title={
                                                            appointment.doctor_user_id !== doctor.id
                                                                ? "Only the consulting doctor can request labs for this appointment"
                                                                : appointment.lab_requests && appointment.lab_requests.some(l => l.status !== 'REJECTED')
                                                                    ? "A lab request already exists for this appointment"
                                                                    : ""
                                                        }
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        Request Lab
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="history">
                    <Card className="border-none shadow-md bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-gray-400" />
                                    My Lab Requests
                                </CardTitle>
                                <CardDescription>Track and review investigation reports submitted by lab technicians</CardDescription>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    className="p-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#388fe5]"
                                    value={requestStatusFilter}
                                    onChange={(e) => {
                                        setRequestStatusFilter(e.target.value);
                                        setRequestPage(1);
                                    }}
                                >
                                    <option value="ALL">All Statuses</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="ACCEPTED">Accepted</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 text-[#388fe5] border-[#388fe5]/20 hover:bg-[#388fe5]/5"
                                    onClick={fetchLabRequests}
                                >
                                    <History className="w-4 h-4" />
                                    Refresh
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-gray-100 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-gray-50/50">
                                        <TableRow>
                                            <TableHead className="w-[100px]">ID</TableHead>
                                            <TableHead>Patient</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Date Requested</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingRequests ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-40 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Loader2 className="w-8 h-8 text-[#388fe5] animate-spin" />
                                                        <p className="text-sm text-gray-500">Loading requests...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : labRequests.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-40 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <FileText className="w-8 h-8 text-gray-200" />
                                                        <p className="text-sm text-gray-500">No lab requests found</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            labRequests.map((request) => (
                                                <TableRow key={request.id}>
                                                    <TableCell className="font-medium text-gray-500">#{request.id}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-900">{request.patient_name}</span>
                                                            <span className="text-xs text-gray-400">Appt: {request.appointment_time ? format(new Date(request.appointment_time), "MMM d, HH:mm") : 'No appt'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-normal border-gray-200 text-gray-600">
                                                            {request.request_type === 'BRAIN_TUMOR' ? 'Brain Tumor' : request.request_type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={cn(
                                                                "font-medium",
                                                                request.priority === 'URGENT'
                                                                    ? "bg-red-50 text-red-700 hover:bg-red-50"
                                                                    : "bg-gray-50 text-gray-700 hover:bg-gray-50"
                                                            )}
                                                        >
                                                            {request.priority}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-gray-500">
                                                        {format(new Date(request.created_at), "MMM d, yyyy")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "w-2 h-2 rounded-full",
                                                                request.status === 'PENDING' && "bg-amber-400",
                                                                request.status === 'ACCEPTED' && "bg-blue-400",
                                                                request.status === 'COMPLETED' && "bg-orange-400 animate-pulse",
                                                                request.status === 'APPROVED' && "bg-green-500",
                                                                request.status === 'REJECTED' && "bg-red-500",
                                                            )} />
                                                            <span className={cn(
                                                                "text-xs font-semibold",
                                                                request.status === 'PENDING' && "text-amber-600",
                                                                request.status === 'ACCEPTED' && "text-blue-600",
                                                                request.status === 'COMPLETED' && "text-orange-600",
                                                                request.status === 'APPROVED' && "text-green-600",
                                                                request.status === 'REJECTED' && "text-red-600",
                                                            )}>
                                                                {request.status}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleOpenReviewModal(request)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Eye className="w-4 h-4 text-[#388fe5]" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {requestTotalPages > 1 && (
                                <div className="flex items-center justify-between mt-6">
                                    <p className="text-sm text-gray-500">
                                        Showing page <span className="font-medium text-gray-900">{requestPage}</span> of <span className="font-medium text-gray-900">{requestTotalPages}</span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setRequestPage(requestPage - 1)}
                                            disabled={requestPage === 1}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setRequestPage(requestPage + 1)}
                                            disabled={requestPage === requestTotalPages}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>


            {/* Lab Review Modal */}
            <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
                <DialogContent className="sm:max-w-[700px] border-none shadow-2xl overflow-hidden p-0 max-h-[90vh] flex flex-col">
                    <div className={cn(
                        "p-6 text-white transition-colors",
                        viewingRequest?.status === 'APPROVED' ? "bg-green-600" :
                            viewingRequest?.status === 'REJECTED' ? "bg-red-600" : "bg-[#388fe5]"
                    )}>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <ShieldCheck className="w-6 h-6" />
                                Investigation Details
                            </DialogTitle>
                            <DialogDescription className="text-white/80">
                                {viewingRequest?.patient_name} • ID: #{viewingRequest?.id}
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto">
                        {/* Investigation Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Type</p>
                                <p className="text-sm font-semibold text-gray-900">
                                    {viewingRequest?.request_type === 'BRAIN_TUMOR' ? 'Brain Tumor Detection' : viewingRequest?.request_type}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Priority</p>
                                <p className="text-sm font-semibold text-gray-900">{viewingRequest?.priority}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Clinic Date</p>
                                <p className="text-sm font-semibold text-gray-900">
                                    {viewingRequest?.appointment_time ? format(new Date(viewingRequest.appointment_time), "MMM d, yyyy") : 'N/A'}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Status</p>
                                <Badge className={cn(
                                    "text-[10px] h-5",
                                    viewingRequest?.status === 'COMPLETED' ? "bg-orange-500 animate-pulse" :
                                        viewingRequest?.status === 'APPROVED' ? "bg-green-500" :
                                            viewingRequest?.status === 'PENDING' ? "bg-amber-500" : "bg-gray-500"
                                )}>
                                    {viewingRequest?.status}
                                </Badge>
                            </div>
                        </div>

                        {/* Report & AI Insights */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-[#388fe5]" />
                                    Laboratory Image
                                </h3>
                                {viewingRequest?.brain_tumor_result?.image_url ? (
                                    <div className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 shadow-inner bg-black">
                                        <img
                                            src={viewingRequest.brain_tumor_result.image_url}
                                            alt="Lab Result"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="aspect-square rounded-xl border border-gray-100 border-dashed bg-gray-50 flex flex-col items-center justify-center text-gray-400">
                                        <FileText className="w-12 h-12 mb-2 opacity-20" />
                                        <p className="text-xs">No image uploaded yet</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-[#388fe5]" />
                                    AI Model Insights
                                </h3>
                                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-4">
                                    {viewingRequest?.brain_tumor_result ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500">Classification</span>
                                                <Badge className={cn(
                                                    "font-bold",
                                                    viewingRequest.brain_tumor_result.result_class === 'YES'
                                                        ? "bg-red-50 text-red-700 hover:bg-red-50 border-red-100"
                                                        : "bg-green-50 text-green-700 hover:bg-green-50 border-green-100"
                                                )}>
                                                    Tumor Detected: {viewingRequest.brain_tumor_result.result_class}
                                                </Badge>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-gray-500">Confidence Score</span>
                                                    <span className="font-bold">{(viewingRequest.brain_tumor_result.confidence * 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-1000",
                                                            viewingRequest.brain_tumor_result.confidence > 0.8 ? "bg-green-500" :
                                                                viewingRequest.brain_tumor_result.confidence > 0.5 ? "bg-amber-500" : "bg-red-500"
                                                        )}
                                                        style={{ width: `${viewingRequest.brain_tumor_result.confidence * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic py-10 text-center">AI analysis pending lab technician processing</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Technician/Initial Notes</p>
                                    <div className="p-3 bg-blue-50/30 rounded-lg text-sm text-gray-600 italic border border-blue-50/50">
                                        {viewingRequest?.notes || "No extra notes provided."}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Review Section */}
                        {(viewingRequest?.status === 'COMPLETED' || viewingRequest?.status === 'APPROVED' || viewingRequest?.status === 'REJECTED') && (
                            <div className="pt-6 border-t border-gray-100 space-y-4">
                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-[#388fe5]" />
                                    Clinical Review
                                </h3>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-semibold text-gray-700">Clinical Rating</label>
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star
                                                        key={s}
                                                        className={cn(
                                                            "w-4 h-4 cursor-pointer transition-colors",
                                                            s <= reviewRating ? "text-amber-400 fill-amber-400" : "text-gray-200"
                                                        )}
                                                        onClick={() => viewingRequest?.status === 'COMPLETED' && setReviewRating(s)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <Textarea
                                            placeholder="Enter your final clinical findings or comments..."
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            readOnly={viewingRequest?.status !== 'COMPLETED'}
                                            className="min-h-[100px] border-gray-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {viewingRequest?.status === 'COMPLETED' ? (
                        <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100">
                            <div className="flex gap-3 w-full">
                                <Button
                                    variant="outline"
                                    onClick={() => handleSubmitReview(false)}
                                    disabled={reviewSubmitting}
                                    className="flex-1 h-11 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100"
                                >
                                    {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                        <>
                                            <X className="w-4 h-4 mr-2" />
                                            Reject Report
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={() => handleSubmitReview(true)}
                                    disabled={reviewSubmitting}
                                    className="flex-[2] h-11 bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {reviewSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                        <>
                                            <Check className="w-4 h-4 mr-2" />
                                            Approve Investigation
                                        </>
                                    )}
                                </Button>
                            </div>
                        </DialogFooter>
                    ) : (
                        <DialogFooter className="p-6 bg-gray-50 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setIsReviewModalOpen(false)} className="w-full h-11">
                                Close Details
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>

            {/* Request Lab Modal */}
            <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Beaker className="w-5 h-5 text-[#388fe5]" />
                            New Lab Request
                        </DialogTitle>
                        <DialogDescription>
                            Create a new investigation request for {selectedPatient?.patient_name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="test-type">Test Category</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger id="test-type">
                                    <SelectValue placeholder="Select test type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="BRAIN_TUMOR">Brain Tumor Detection (AI-Powered)</SelectItem>
                                    <SelectItem value="OTHER">Other Clinical Test</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Priority Level</Label>
                            <RadioGroup value={priority} onValueChange={setPriority} className="flex gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="NORMAL" id="p1" />
                                    <Label htmlFor="p1">Normal</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="URGENT" id="p2" className="text-red-600 border-red-600" />
                                    <Label htmlFor="p2" className="text-red-700 font-medium">Urgent</Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Clinical Notes / Instructions</Label>
                            <Textarea
                                id="notes"
                                placeholder="Add specific instructions for the lab technician..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleSubmitRequest}
                            disabled={submitting}
                            className="bg-[#388fe5] hover:bg-[#2d7ad1] text-white"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Request"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
