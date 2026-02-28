"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppDispatch, RootState } from "@/store/store";
import { selectPaitentForSoap } from "@/store/slices/patientSlice";
import { fetchSoapNoteByAppointmentId, resetSoapNoteState, fetchContextualHighlights, Highlight } from "@/store/slices/soapNoteSlice";
import { UpcomingAppointment } from "./types";
import { Sparkles, AlertCircle, FileText, User, Stethoscope, ClipboardList } from "lucide-react";

// Helper function to apply highlights to a block of text
const applyHighlights = (originalText: string, highlights: Highlight[] | null) => {
    if (!highlights || highlights.length === 0) {
        return { __html: originalText };
    }

    const severityClasses = {
        high: "bg-red-200 text-red-900 px-1 rounded",
        medium: "bg-yellow-200 text-yellow-900 px-1 rounded",
        low: "bg-blue-200 text-blue-900 px-1 rounded",
    };

    let highlightedHtml = originalText;
    highlights.forEach(highlight => {
        // Use a regex for safe replacement to avoid replacing parts of other words
        const regex = new RegExp(highlight.text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g');
        const className = severityClasses[highlight.severity] || "bg-gray-200";
        highlightedHtml = highlightedHtml.replace(
            regex,
            `<mark class="${className}" title="${highlight.reason}">${highlight.text}</mark>`
        );
    });

    return { __html: highlightedHtml };
};

const SoapNoteSkeleton = () => (
    <div className="space-y-6 py-4">
        {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-10 w-full" />
            </div>
        ))}
    </div>
);

export const SoapNoteDialog = ({ appointment }: { appointment: UpcomingAppointment }) => {
    const dispatch = useDispatch<AppDispatch>();
    const router = useRouter();
    const { data: note, status, error, highlights, highlightStatus } = useSelector((state: RootState) => state.soapNote);

    useEffect(() => {
        if (appointment.id) {
            dispatch(fetchSoapNoteByAppointmentId(appointment.id));
        }
        return () => {
            dispatch(resetSoapNoteState());
        };
    }, [appointment.id, dispatch]);

    useEffect(() => {
        if (status === 'failed' || highlightStatus === 'failed') {
            toast.error(error || "An error occurred. Please try again.");
        }
    }, [status, highlightStatus, error]);

    const handleAddSoapNote = () => {
        dispatch(selectPaitentForSoap({
            apppointment_id: appointment.id,
            patient_name: appointment.patient_name,
            doctor_name: appointment.doctor_name,
            status: appointment.status
        }));
        router.push("/doctor/soap-notes");
    };

    const handleGenerateHighlights = () => {
        if (note?.soap_note_id) {
            dispatch(fetchContextualHighlights(note.soap_note_id));
        }
    };

    const renderContent = () => {
        if (status === 'loading' || status === 'idle') {
            return <SoapNoteSkeleton />;
        }
        if (status === 'failed' || !note) {
            return (
                <div className="py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-gray-900 font-bold">Error loading SOAP note</p>
                    <p className="text-gray-500 text-sm mt-1">{error || "Please try again later."}</p>
                </div>
            );
        }
        if (note.soap_note_id === null) {
            return (
                <div className="py-12 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                        <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                    <p className="text-gray-900 font-bold">No SOAP note available</p>
                    <p className="text-gray-500 text-sm mt-1">Add a SOAP note to document this appointment</p>
                </div>
            );
        }

        const { subjective, objective, assessment, plan } = note.soap_note;

        return (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {/* Subjective */}
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-500 rounded">
                            <User className="h-3.5 w-3.5 text-white" />
                        </div>
                        <h4 className="font-bold text-gray-900 uppercase tracking-wide text-xs">Subjective</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={applyHighlights(subjective, highlights)} />
                </div>

                {/* Objective */}
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-green-500 rounded">
                            <Stethoscope className="h-3.5 w-3.5 text-white" />
                        </div>
                        <h4 className="font-bold text-gray-900 uppercase tracking-wide text-xs">Objective</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={applyHighlights(objective, highlights)} />
                </div>

                {/* Assessment */}
                <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-orange-500 rounded">
                            <FileText className="h-3.5 w-3.5 text-white" />
                        </div>
                        <h4 className="font-bold text-gray-900 uppercase tracking-wide text-xs">Assessment</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={applyHighlights(assessment, highlights)} />
                </div>

                {/* Plan */}
                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-500 rounded">
                            <ClipboardList className="h-3.5 w-3.5 text-white" />
                        </div>
                        <h4 className="font-bold text-gray-900 uppercase tracking-wide text-xs">Plan</h4>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap" dangerouslySetInnerHTML={applyHighlights(plan, highlights)} />
                </div>
            </div>
        );
    };

    return (
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>SOAP Note for {appointment.patient_name}</DialogTitle>
            </DialogHeader>
            {renderContent()}
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>

                {/* Conditionally render the correct button */}
                {status === 'succeeded' && note && (
                    <>
                        {note.soap_note_id === null ? (
                            <DialogClose asChild>
                                <Button onClick={handleAddSoapNote} className="bg-[#388fe5] hover:bg-[#6fb043] text-white">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Add SOAP Note
                                </Button>
                            </DialogClose>
                        ) : (
                            <Button onClick={handleGenerateHighlights} disabled={highlightStatus === 'loading'}>
                                <Sparkles className="h-4 w-4 mr-2" />
                                {highlightStatus === 'loading' ? 'Analyzing...' : 'Context Highlight'}
                            </Button>
                        )}
                    </>
                )}
            </DialogFooter>
        </DialogContent>
    );
};