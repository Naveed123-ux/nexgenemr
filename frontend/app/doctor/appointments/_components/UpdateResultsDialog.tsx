"use client";

import { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

import { updateAppointmentResults } from "@/store/slices/appointmentSlice";
import { UpcomingAppointment } from "./types";
import { AppDispatch } from "@/store/store";

export const UpdateResultsDialog = ({ appointment }: { appointment: UpcomingAppointment }) => {
    const dispatch = useDispatch<AppDispatch>();
    const [results, setResults] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!results.trim()) {
            toast.error("Results cannot be empty.");
            return;
        }
        setIsSaving(true);
        dispatch(updateAppointmentResults({ appointmentId: appointment.id, results }))
            .unwrap()
            .then(() => {
                toast.success("Appointment results updated successfully.");
                // The dialog will close automatically because it's wrapped in a DialogClose
            })
            .catch((error) => {
                toast.error(error);
            })
            .finally(() => {
                setIsSaving(false);
            });
    };

    return (
        <DialogContent>
            <DialogHeader><DialogTitle>Update Appointment Results</DialogTitle></DialogHeader>
            <div className="py-4">
                <Textarea placeholder="Enter appointment results, notes, or summary..." value={results} onChange={(e) => setResults(e.target.value)} rows={6} />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <DialogClose asChild>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Results</>}
                    </Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
};