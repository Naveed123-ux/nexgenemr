"use client";

import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { format } from "date-fns";
import { toast } from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { AppDispatch, RootState } from "@/store/store";
import { rescheduleAppointment } from "@/store/slices/appointmentSlice";
import { fetchAllAvailableSlots } from "@/store/slices/availableSlotsSlice"; // <-- Import new thunk
import { UpcomingAppointment } from "./types";

export const RescheduleDialog = ({ appointment }: { appointment: UpcomingAppointment }) => {
    const dispatch = useDispatch<AppDispatch>();

    // Fetch data from the new slice
    const { slots: allAvailableSlots, status } = useSelector((state: RootState) => state.availableSlots);

    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(); // Stores the slot ID
    const [isRescheduling, setIsRescheduling] = useState(false);

    useEffect(() => {
        // Fetch all slots once when the component mounts
        if (status === 'idle') {
            dispatch(fetchAllAvailableSlots());
        }
    }, [dispatch, status]);

    // Memoize the set of dates that have available slots for calendar highlighting
    const daysWithSlots = useMemo(() => {
        return new Set(allAvailableSlots.map(slot => format(new Date(slot.start_time), 'yyyy-MM-dd')));
    }, [allAvailableSlots]);

    // Filter available slots based on the selected date
    const slotsForSelectedDate = useMemo(() => {
        if (!selectedDate || !allAvailableSlots) return [];
        const formattedSelectedDate = format(selectedDate, 'yyyy-MM-dd');
        return allAvailableSlots.filter(slot =>
            format(new Date(slot.start_time), 'yyyy-MM-dd') === formattedSelectedDate && slot.status === 'Available'
        );
    }, [selectedDate, allAvailableSlots]);

    const handleReschedule = () => {
        if (!selectedSlotId) {
            toast.error("Please select a new time slot.");
            return;
        }

        setIsRescheduling(true);
        const slotIdAsNumber = parseInt(selectedSlotId, 10);

        dispatch(rescheduleAppointment({ appointmentId: appointment.id, new_slot_id: slotIdAsNumber }))
            .unwrap()
            .then(() => {
                toast.success("Appointment rescheduled successfully.");
                // The DialogClose wrapper will handle closing the modal
            })
            .catch((error) => {
                toast.error(`Failed to reschedule: ${error}`);
            })
            .finally(() => {
                setIsRescheduling(false);
            });
    };

    return (
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
                <DialogTitle>Reschedule for {appointment.patient_name}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div>
                    <h3 className="text-sm font-medium mb-2 text-center">1. Select a new date</h3>
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="rounded-md border flex justify-center"
                        modifiers={{ available: Array.from(daysWithSlots).map(day => new Date(day)) }}
                        modifiersStyles={{ available: { fontWeight: 'bold', textDecoration: 'underline' } }}
                    />
                </div>
                <div>
                    <h3 className="text-sm font-medium mb-2">2. Select an available time</h3>
                    {status === 'loading' && <Skeleton className="h-10 w-full" />}
                    {status !== 'loading' && (
                        <>
                            {!selectedDate ? (
                                <div className="text-sm text-center text-muted-foreground h-10 flex items-center justify-center p-4 border rounded-md">
                                    Please select a date first.
                                </div>
                            ) : slotsForSelectedDate.length > 0 ? (
                                <Select onValueChange={setSelectedSlotId} value={selectedSlotId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a time slot" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {slotsForSelectedDate.map(slot => (
                                            <SelectItem key={slot.id} value={String(slot.id)}>
                                                {format(new Date(slot.start_time), 'p')}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="text-sm text-center text-muted-foreground h-10 flex items-center justify-center p-4 border rounded-md">
                                    No available slots for this day.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                    <Button onClick={handleReschedule} disabled={!selectedSlotId || isRescheduling}>
                        {isRescheduling ? "Rescheduling..." : "Confirm Reschedule"}
                    </Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
};