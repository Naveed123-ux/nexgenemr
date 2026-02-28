"use client";

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { toast } from "react-hot-toast";

// UI Components
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Plus, Video, ExternalLink, Calendar as CalendarIcon, Sparkles, User, Clock, FileText, Stethoscope, ClipboardList, ArrowLeftRight } from "lucide-react";
import { useSwapAppointment } from "./SwapAppointmentContext";
import { SwapConfirmationDialog } from "./SwapConfirmationDialog";
import { CancelAppointmentButton } from "./CancelAppointmentButton";

// Utils and State
import { cn } from "@/lib/utils";
import { AppDispatch, RootState } from "@/store/store";
import { selectPaitentForSoap } from "@/store/slices/patientSlice";
import { fetchSoapNoteByAppointmentId, resetSoapNoteState, fetchContextualHighlights, Highlight } from "@/store/slices/soapNoteSlice";
import { FormattedAppointment } from "./types";

// --- Helper Functions ---
const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getWeekDays = (monday: Date): Date[] => Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
});

const isToday = (someDate: Date) => {
    const today = new Date();
    return someDate.getDate() === today.getDate() && someDate.getMonth() === today.getMonth() && someDate.getFullYear() === today.getFullYear();
};

const applyHighlights = (originalText: string, highlights: Highlight[] | null) => {
    if (!highlights || highlights.length === 0 || !originalText) {
        return { __html: originalText.replace(/\n/g, '<br />') }; // Also handle newlines
    }
    const severityClasses = {
        high: "bg-red-200 text-red-900 px-1 rounded",
        medium: "bg-yellow-200 text-yellow-900 px-1 rounded",
        low: "bg-blue-200 text-blue-900 px-1 rounded",
    };
    let highlightedHtml = originalText.replace(/\n/g, '<br />');
    highlights.forEach(highlight => {
        const regex = new RegExp(highlight.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        const className = severityClasses[highlight.severity] || "bg-gray-200";
        highlightedHtml = highlightedHtml.replace(regex, `<mark class="${className}" title="${highlight.reason}">${highlight.text}</mark>`);
    });
    return { __html: highlightedHtml };
};

// --- Dialog Content Component ---
// This component now correctly uses its mount/unmount lifecycle for data fetching and cleanup.
const AppointmentDetailsDialog = ({
    appointment,
    onClose,
    onSwapClick
}: {
    appointment: FormattedAppointment;
    onClose: () => void;
    onSwapClick: () => void;
}) => {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const { data: note, status, error, highlights, highlightStatus } = useSelector((state: RootState) => state.soapNote);
    const { isSwapMode, firstAppointment } = useSwapAppointment();

    useEffect(() => {
        // 1. FETCH on mount
        if (appointment.id) {
            dispatch(fetchSoapNoteByAppointmentId(appointment.id));
        }
        // 2. RESET on unmount
        return () => {
            dispatch(resetSoapNoteState());
        };
    }, [appointment.id, dispatch]);

    useEffect(() => {
        if ((status === 'failed' || highlightStatus === 'failed') && error) {
            toast.error(error);
        }
    }, [status, highlightStatus, error]);

    const handleAddSoapNote = () => {
        dispatch(selectPaitentForSoap({ apppointment_id: appointment.id, patient_name: appointment.patient_name, doctor_name: appointment.doctor_name, status: appointment.status }));
        router.push("/doctor/soap-notes");
    };

    const handleGenerateHighlights = () => {
        if (note?.soap_note_id) {
            dispatch(fetchContextualHighlights(note.soap_note_id));
        }
    };

    return (
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                        <CalendarIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-bold">Appointment Details</DialogTitle>
                        <p className="text-sm text-muted-foreground">View appointment information and SOAP notes</p>
                    </div>
                </div>
            </DialogHeader>

            {/* Patient & Time Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
                        <User className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Patient</p>
                        <p className="text-base font-bold text-gray-900 break-words">{appointment.patient_name}</p>
                    </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="p-2 bg-purple-500 rounded-lg flex-shrink-0">
                        <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Time</p>
                        <p className="text-base font-bold text-gray-900 break-words">{appointment.timeDisplay}</p>
                        <p className="text-sm text-gray-600 mt-1">{appointment.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                </div>
            </div>

            {/* SOAP Note Section */}
            <div className="mt-6">
                <div className="flex items-center gap-2 pb-3 border-b mb-4">
                    <FileText className="h-5 w-5 text-[#388fe5]" />
                    <h3 className="font-bold text-lg">SOAP Note</h3>
                </div>

                {status === 'loading' ? (
                    <div className="space-y-4">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                ) : note && note.soap_note_id !== null ? (
                    <div className="space-y-4">
                        {/* Subjective */}
                        <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-blue-500 rounded">
                                    <User className="h-3.5 w-3.5 text-white" />
                                </div>
                                <h4 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Subjective</h4>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={applyHighlights(note.soap_note.subjective, highlights)} />
                        </div>

                        {/* Objective */}
                        <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-green-500 rounded">
                                    <Stethoscope className="h-3.5 w-3.5 text-white" />
                                </div>
                                <h4 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Objective</h4>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={applyHighlights(note.soap_note.objective, highlights)} />
                        </div>

                        {/* Assessment */}
                        <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-orange-500 rounded">
                                    <FileText className="h-3.5 w-3.5 text-white" />
                                </div>
                                <h4 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Assessment</h4>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={applyHighlights(note.soap_note.assessment, highlights)} />
                        </div>

                        {/* Plan */}
                        <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-1.5 bg-purple-500 rounded">
                                    <ClipboardList className="h-3.5 w-3.5 text-white" />
                                </div>
                                <h4 className="font-bold text-gray-900 uppercase tracking-wide text-sm">Plan</h4>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={applyHighlights(note.soap_note.plan, highlights)} />
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                            <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium text-base">No SOAP note available</p>
                        <p className="text-sm text-gray-400 mt-2">Add a SOAP note to document this appointment</p>
                    </div>
                )}
            </div>

            <DialogFooter className="gap-2 sm:justify-between mt-6">
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/doctor/reschedule-appointment?appointmentId=${appointment.id}`)}
                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                    >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Reschedule
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onSwapClick}
                        className={cn(
                            isSwapMode && firstAppointment?.id === appointment.id
                                ? "border-blue-500 text-blue-700 bg-blue-50"
                                : isSwapMode
                                    ? "border-purple-500 text-purple-700 hover:bg-purple-50"
                                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        <ArrowLeftRight className="h-4 w-4 mr-2" />
                        {isSwapMode && firstAppointment?.id === appointment.id
                            ? "Selected"
                            : isSwapMode
                                ? "Swap with This"
                                : "Swap Appointment"}
                    </Button>
                    <CancelAppointmentButton
                        appointmentId={appointment.id}
                        patientName={appointment.patient_name}
                        appointmentTime={appointment.timeDisplay}
                        onSuccess={onClose}
                    />
                </div>
                <div className="flex gap-2">
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                    {status === 'succeeded' && note && (
                        <>
                            {note.soap_note_id === null ? (
                                <Button onClick={handleAddSoapNote} className="bg-[#388fe5] hover:bg-[#6fb043] text-white">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Add SOAP Note
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleGenerateHighlights}
                                    disabled={highlightStatus === 'loading'}
                                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    {highlightStatus === 'loading' ? 'Analyzing...' : 'Context Highlight'}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </DialogFooter>
        </DialogContent>
    );
};

// --- NEW Wrapper Component for Each Calendar Block ---
// This component manages the open/close state for a SINGLE dialog,
// ensuring that the content (AppointmentDetailsDialog) is mounted and unmounted correctly.
const AppointmentBlock = ({ appointment, position }: { appointment: FormattedAppointment; position: { top: string; height: string } }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSwapConfirmOpen, setIsSwapConfirmOpen] = useState(false);
    const { isSwapMode, firstAppointment, startSwapMode } = useSwapAppointment();

    // Determine if this appointment is selected for swap
    const isFirstSelected = isSwapMode && firstAppointment?.id === appointment.id;
    const isSwappable = isSwapMode && !isFirstSelected;

    const handleSwapClick = () => {
        if (isSwapMode && firstAppointment) {
            // This is the second appointment selection
            if (firstAppointment.id === appointment.id) {
                toast.error("Cannot swap an appointment with itself");
                return;
            }
            setIsOpen(false); // Close the details dialog
            setIsSwapConfirmOpen(true); // Open swap confirmation
        } else {
            // This is the first appointment selection
            startSwapMode(appointment);
            setIsOpen(false); // Close the details dialog
            toast.success("Appointment selected for swap. Now select another appointment to swap with.");
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <div
                        className={cn(
                            "absolute flex flex-col p-1.5 overflow-hidden rounded-md cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] z-10 text-xs",
                            isFirstSelected
                                ? "bg-blue-100 border-l-4 border-blue-500 text-blue-900 shadow-md"
                                : isSwappable
                                    ? "bg-purple-50 border-l-4 border-purple-400 text-purple-900"
                                    : appointment.status === "Confirmed"
                                        ? "bg-green-100 border-l-2 border-green-500 text-green-900"
                                        : "bg-gray-100 border-l-2 border-gray-400 text-gray-800"
                        )}
                        style={{ top: position.top, height: position.height, left: "2px", right: "2px" }}
                    >
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-semibold text-[10px] truncate flex-1">{appointment.patient_name}</span>
                            <div className="flex items-center gap-0.5">
                                {isFirstSelected && <ArrowLeftRight className="w-2.5 h-2.5 flex-shrink-0 text-blue-600" />}
                                {appointment.is_telehealth && <Video className="w-2.5 h-2.5 flex-shrink-0" />}
                            </div>
                        </div>
                        <span className="text-[10px] truncate text-gray-600">{appointment.timeDisplay}</span>
                    </div>
                </DialogTrigger>
                {/* **CRITICAL FIX**: Conditionally render the dialog content. */}
                {/* This ensures it mounts on open and unmounts on close, triggering the useEffect cleanup. */}
                {isOpen && (
                    <AppointmentDetailsDialog
                        appointment={appointment}
                        onClose={() => setIsOpen(false)}
                        onSwapClick={handleSwapClick}
                    />
                )}
            </Dialog>

            {/* Swap Confirmation Dialog - Rendered outside the details dialog */}
            {isSwapMode && firstAppointment && firstAppointment.id !== appointment.id && (
                <SwapConfirmationDialog
                    isOpen={isSwapConfirmOpen}
                    onClose={() => setIsSwapConfirmOpen(false)}
                    secondAppointment={appointment}
                />
            )}
        </>
    );
};


// --- Main CustomWeekCalendar Component ---
export const CustomWeekCalendar = ({ appointments, currentWeek, setCurrentWeek }: { appointments: FormattedAppointment[]; currentWeek: Date; setCurrentWeek: (date: Date) => void; }) => {
    const weekDays = getWeekDays(currentWeek);
    const timeSlots = Array.from({ length: 8 }, (_, i) => `${(9 + i).toString().padStart(2, "0")}:00`);
    const dateRange: DateRange = { from: currentWeek, to: weekDays[6] };

    const handleWeekSelect = (range: DateRange | undefined) => { if (range?.from) setCurrentWeek(getMonday(range.from)); };

    const getAppointmentPosition = (startTime: string, endTime: string) => {
        const [startHour, startMin] = startTime.split(":").map(Number);
        const [endHour, endMin] = endTime.split(":").map(Number);
        const startTotalMinutes = startHour * 60 + startMin;
        const endTotalMinutes = endHour * 60 + endMin;
        const top = ((startTotalMinutes - 9 * 60) / 60) * 80;
        const height = ((endTotalMinutes - startTotalMinutes) / 60) * 80;
        return { top: `${top}px`, height: `${Math.max(height, 40)}px` };
    };

    const navigateWeek = (direction: "prev" | "next") => {
        const newDate = new Date(currentWeek);
        newDate.setDate(currentWeek.getDate() + (direction === "next" ? 7 : -7));
        setCurrentWeek(newDate);
    };

    return (
        <Card className="p-3 md:p-6 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-0 mb-6">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => navigateWeek("prev")}><ChevronLeft className="h-4 w-4" /></Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(dateRange.from!, "LLL dd, y")} - {format(dateRange.to!, "LLL dd, y")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar initialFocus mode="range" defaultMonth={dateRange.from} selected={dateRange} onSelect={handleWeekSelect} numberOfMonths={1} /></PopoverContent>
                    </Popover>
                    <Button variant="outline" size="icon" onClick={() => navigateWeek("next")}><ChevronRight className="h-4 w-4" /></Button>
                </div>
                <Button><Plus className="w-4 h-4 mr-2" />Add new</Button>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
                <div className="grid grid-cols-8 border-b pb-4 mb-4 min-w-[700px]">
                    <div className="text-sm text-gray-500 font-medium">Time</div>
                    {weekDays.map((day) => (
                        <div key={day.toISOString()} className={cn("text-center p-1 rounded-lg", isToday(day) && "bg-blue-50")}>
                            <div className={cn("mx-auto text-sm font-semibold flex items-center justify-center w-7 h-7", isToday(day) && "bg-blue-600 text-white rounded-full")}>{day.getDate()}</div>
                            <div className="text-xs text-gray-500 mt-1">{day.toLocaleDateString("en-US", { weekday: "short" })}</div>
                        </div>
                    ))}
                </div>
                <div className="relative min-w-[700px] h-[640px]">
                    <div className="absolute left-0 top-0 w-16">
                        {timeSlots.map((time) => (<div key={time} className="h-[80px] pt-2 text-xs text-gray-400">{time}</div>))}
                    </div>
                    <div className="ml-16 grid grid-cols-7 h-full">
                        {weekDays.map((day, dayIndex) => (
                            <div key={dayIndex} className="relative border-r border-gray-100 last:border-r-0">
                                {timeSlots.map((_, hourIndex) => (<div key={hourIndex} className="absolute left-0 right-0 border-t border-gray-100" style={{ top: `${hourIndex * 80}px` }} />))}
                                {appointments
                                    .filter((apt) => apt.date.toDateString() === day.toDateString())
                                    .map((appointment) => {
                                        const position = getAppointmentPosition(appointment.startTime, appointment.endTime);
                                        // Use the new wrapper component here
                                        return <AppointmentBlock key={appointment.id} appointment={appointment} position={position} />;
                                    })}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};