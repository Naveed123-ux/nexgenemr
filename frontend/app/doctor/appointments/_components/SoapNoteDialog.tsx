"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppDispatch, RootState } from "@/store/store";
import { selectPaitentForSoap } from "@/store/slices/patientSlice";
import { fetchSoapNoteByAppointmentId, resetSoapNoteState, fetchContextualHighlights, Highlight } from "@/store/slices/soapNoteSlice";
import { UpcomingAppointment } from "./types";
import { Sparkles } from "lucide-react";

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
            toast.error("An error occurred", { description: error || "Please try again." });
        }
    }, [status, highlightStatus, error]);

    const handleAddSoapNote = () => { /* ... existing code ... */ };

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
            return <div className="py-8 text-center"><p className="text-destructive">Error loading SOAP note.</p></div>;
        }
        if (note.soap_note_id === null) {
            return <div className="py-8 text-center"><p className="text-muted-foreground">No SOAP note found for this appointment.</p></div>;
        }

        const { subjective, objective, assessment, plan } = note.soap_note;

        return (
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                <div>
                    <h4 className="font-semibold text-gray-800">Subjective</h4>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={applyHighlights(subjective, highlights)} />
                </div>
                <div>
                    <h4 className="font-semibold text-gray-800">Objective</h4>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={applyHighlights(objective, highlights)} />
                </div>
                <div>
                    <h4 className="font-semibold text-gray-800">Assessment</h4>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={applyHighlights(assessment, highlights)} />
                </div>
                <div>
                    <h4 className="font-semibold text-gray-800">Plan</h4>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap" dangerouslySetInnerHTML={applyHighlights(plan, highlights)} />
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
                                <Button onClick={handleAddSoapNote}>Add SOAP Note</Button>
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