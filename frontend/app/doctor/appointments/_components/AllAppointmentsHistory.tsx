"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format, isPast } from "date-fns";
import { toast } from "react-hot-toast";
import { AppDispatch, RootState } from "@/store/store";
import { fetchAllAppointments, cancelAppointment } from "@/store/slices/appointmentSlice";
import { cn } from "@/lib/utils";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePenLine, MoreVertical, Trash2, Stethoscope, History, Clock, User, FileText, Calendar as CalendarIcon } from "lucide-react";
import { UpdateResultsDialog } from "./UpdateResultsDialog";
import { IcdCodeManager } from "@/components/appointments/IcdCodeManager";

// A small sub-component to handle status badge styling
const StatusBadge = ({ status }: { status: string }) => {
    const lowerCaseStatus = status.toLowerCase();
    return (
        <Badge
            className={cn(
                "text-xs font-medium", // Base classes for all badges
                lowerCaseStatus === 'completed' && 'border-blue-500 bg-blue-50 text-blue-700',
                lowerCaseStatus === 'confirmed' && 'border-green-500 bg-green-50 text-green-700',
                lowerCaseStatus === 'canceled' && 'border-red-500 bg-red-50 text-red-700',
                lowerCaseStatus === 'pending' && 'border-yellow-500 bg-yellow-50 text-yellow-700'
            )}
            variant="outline"
        >
            {status}
        </Badge>
    );
};

export const AllAppointmentsHistory = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { all: appointments, allStatus: status } = useSelector((state: RootState) => state.appointments);
    const [selectedAppointmentForIcd, setSelectedAppointmentForIcd] = useState<{
        id: number;
        patientName: string;
        date: string;
    } | null>(null);

    useEffect(() => {
        if (status === 'idle') {
            dispatch(fetchAllAppointments());
        }
    }, [status, dispatch]);

    const handleCancelAppointment = (appointmentId: number) => {
        dispatch(cancelAppointment(appointmentId))
            .unwrap()
            .then(() => {
                toast.success("Appointment has been canceled successfully.");
            })
            .catch((error) => {
                toast.error("Failed to cancel appointment:", error);
            });
    };

    const renderContent = () => {
        if (status === 'loading') {
            return (
                <div className="space-y-2 mt-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            );
        }

        if (appointments.length === 0 && status === 'succeeded') {
            return (
                <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-100 rounded-full mb-4">
                        <History className="h-10 w-10 text-purple-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Appointment History</h3>
                    <p className="text-gray-500">Your appointment history will appear here</p>
                    <p className="text-sm text-gray-400 mt-2">Completed appointments will be archived</p>
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="font-semibold text-gray-700 uppercase tracking-wider text-xs">Patient</TableHead>
                            <TableHead className="font-semibold text-gray-700 uppercase tracking-wider text-xs">Date & Time</TableHead>
                            <TableHead className="font-semibold text-gray-700 uppercase tracking-wider text-xs">Status</TableHead>
                            <TableHead className="font-semibold text-gray-700 uppercase tracking-wider text-xs">Result</TableHead>
                            <TableHead className="text-right font-semibold text-gray-700 uppercase tracking-wider text-xs">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {appointments.map((appt) => {
                            const isCancellable = !['completed', 'Cancelled'].includes(appt.status.toLowerCase()) && !isPast(new Date(appt.start_time));

                            return (
                                <TableRow key={appt.id} className="hover:bg-gray-50 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                                <User className="h-3.5 w-3.5 text-blue-600" />
                                            </div>
                                            <span className="font-semibold text-gray-900">{appt.patient_name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                                            {format(new Date(appt.start_time), "LLL dd, yyyy 'at' p")}
                                        </div>
                                    </TableCell>
                                    <TableCell><StatusBadge status={appt.status} /></TableCell>

                                    <TableCell className="max-w-[100px]">
                                        {appt.results ? (
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <p className="truncate cursor-pointer hover:text-primary hover:underline">
                                                        {appt.results}
                                                    </p>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Results for {appt.patient_name}</DialogTitle>
                                                        <DialogDescription>
                                                            Appointment on {format(new Date(appt.start_time), "LLL dd, yyyy")}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="py-4 max-h-[60vh] overflow-y-auto">
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                            {appt.results}
                                                        </p>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">N/A</span>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setSelectedAppointmentForIcd({
                                                    id: appt.id,
                                                    patientName: appt.patient_name,
                                                    date: format(new Date(appt.start_time), "LLL dd, yyyy 'at' p")
                                                })}>
                                                    <Stethoscope className="h-4 w-4 mr-2" />
                                                    Manage ICD Codes
                                                </DropdownMenuItem>
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                            <FilePenLine className="h-4 w-4 mr-2" />
                                                            Update Results
                                                        </DropdownMenuItem>
                                                    </DialogTrigger>
                                                    <UpdateResultsDialog appointment={appt} />
                                                </Dialog>
                                                {isCancellable && (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem className="text-red-600" onSelect={(e) => e.preventDefault()}>
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Cancel Appointment
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently cancel the appointment for {appt.patient_name}.
                                                                    This action is not reversible.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Back</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleCancelAppointment(appt.id)}
                                                                    className={buttonVariants({ variant: "destructive" })}
                                                                >
                                                                    Yes, cancel it
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        );
    };

    return (
        <>
            <Card className="shadow-lg border-2 border-gray-100">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-white border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500 rounded-lg">
                                <History className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Appointment History</CardTitle>
                                <CardDescription className="mt-1">
                                    {appointments.length} {appointments.length === 1 ? 'appointment' : 'appointments'} on record
                                </CardDescription>
                            </div>
                        </div>
                        {appointments.length > 0 && (
                            <Badge variant="outline" className="text-sm">
                                {appointments.length} Total
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {renderContent()}
                </CardContent>
            </Card>

            {/* ICD Code Manager Dialog */}
            {selectedAppointmentForIcd && (
                <IcdCodeManager
                    isOpen={!!selectedAppointmentForIcd}
                    onClose={() => setSelectedAppointmentForIcd(null)}
                    appointmentId={selectedAppointmentForIcd.id}
                    appointmentDetails={{
                        patientName: selectedAppointmentForIcd.patientName,
                        date: selectedAppointmentForIcd.date
                    }}
                />
            )}
        </>
    );
};