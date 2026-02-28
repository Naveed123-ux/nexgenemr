"use client";

import { useState } from "react";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { labRequestApi } from "@/app/_apis/lab_requests";
import { toast } from "react-hot-toast";
import { Loader2, Beaker } from "lucide-react";

interface LabRequestDialogProps {
    appointmentId: number;
    patientId: number;
    onSuccess?: () => void;
}

export const LabRequestDialog = ({ appointmentId, patientId, onSuccess }: LabRequestDialogProps) => {
    const [requestType, setRequestType] = useState<string>("BRAIN_TUMOR");
    const [priority, setPriority] = useState<string>("NORMAL");
    const [notes, setNotes] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        try {
            setIsSubmitting(true);
            await labRequestApi.createRequest({
                patient_id: patientId,
                request_type: requestType,
                appointment_id: appointmentId,
                notes: notes,
                priority: priority
            });
            toast.success("Lab request created successfully");
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Failed to create lab request:", error);
            toast.error("Failed to create lab request");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-blue-600" />
                    New Lab Request
                </DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
                <div className="space-y-2">
                    <Label htmlFor="test-type">Test Category</Label>
                    <Select value={requestType} onValueChange={setRequestType}>
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
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isSubmitting ? (
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
    );
};
