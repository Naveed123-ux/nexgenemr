"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar, Clock, User, CircleX, CircleCheckBig, Loader2, UserPlus } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import { confirmAppointment, fetchPatients, searchIcdCodes } from "@/app/_apis/staff/receptionist";
import { DoctorProfile, PatientProfile, SlotWithExtras } from "./types";
import { InfinitySpin } from "react-loader-spinner";
import { WaitlistManagementPanel } from "@/components/waitlist/waitlist-management-panel";

interface AppointmentBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedSlot: SlotWithExtras;
    doctorProfile: DoctorProfile;
}

interface IcdCode {
    id: number;
    code: string;
    description: string;
}

export function AppointmentBookingModal({ isOpen, onClose, selectedSlot, doctorProfile }: AppointmentBookingModalProps) {
    const [reasonForVisit, setReasonForVisit] = useState("");
    const [isTelehealth, setIsTelehealth] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
    const [patients, setPatients] = useState<PatientProfile[]>([]);
    const [patientQuery, setPatientQuery] = useState("");
    const [patientPage, setPatientPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [patientLoading, setPatientLoading] = useState(false);
    const [booking, setBooking] = useState(false);

    // State for ICD Code Search (Multiple Selection)
    const [icdQuery, setIcdQuery] = useState("");
    const [icdResults, setIcdResults] = useState<IcdCode[]>([]);
    const [selectedIcdCodes, setSelectedIcdCodes] = useState<IcdCode[]>([]);
    const [isIcdLoading, setIsIcdLoading] = useState(false);
    const [isIcdPopoverOpen, setIsIcdPopoverOpen] = useState(false);

    // State for waitlist
    const [showWaitlist, setShowWaitlist] = useState(false);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastPatientRef = useCallback((node: any) => {
        if (patientLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                setPatientPage(prev => prev + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [patientLoading, hasMore]);

    useEffect(() => {
        const loadPatients = async () => {
            if (!isOpen) return;
            setPatientLoading(true);
            try {
                const result = await fetchPatients(patientQuery, patientPage);
                setPatients(prev => patientPage === 1 ? result.data : [...prev, ...result.data]);
                setHasMore(result.hasMore);
            } catch {
                toast.error("Failed to load patients");
            } finally {
                setPatientLoading(false);
            }
        };
        loadPatients();
    }, [isOpen, patientQuery, patientPage]);

    useEffect(() => {
        const handler = setTimeout(() => setPatientPage(1), 500);
        return () => clearTimeout(handler);
    }, [patientQuery]);

    // Debounced search for ICD codes
    useEffect(() => {
        if (icdQuery.trim().length < 2) {
            setIcdResults([]);
            setIsIcdPopoverOpen(false); // Close if query is too short
            return;
        }

        setIsIcdPopoverOpen(true); // Open the popover when user starts a valid search
        const handler = setTimeout(async () => {
            setIsIcdLoading(true);
            try {
                const results = await searchIcdCodes(icdQuery);
                setIcdResults(results);
            } catch (error) {
                toast.error("Failed to search for ICD codes.");
                setIsIcdPopoverOpen(false); // Close on error
            } finally {
                setIsIcdLoading(false);
            }
        }, 300); // 300ms debounce delay

        return () => {
            clearTimeout(handler);
        };
    }, [icdQuery]);

    const handleBookAppointment = async () => {
        if (!reasonForVisit || !selectedPatient) {
            return toast.error("Please select a patient and provide a reason.");
        }
        setBooking(true);
        try {
            const appointmentData: any = {
                patient_user_id: selectedPatient.user_id,
                appointment_slot_id: selectedSlot.id,
                is_telehealth: isTelehealth,
                reason_for_visit: reasonForVisit,
            };

            // Add ICD codes if selected (support both single and multiple)
            if (selectedIcdCodes.length > 0) {
                appointmentData.icd_code_ids = selectedIcdCodes.map(code => code.id);
            }

            await confirmAppointment(appointmentData);
            toast.success("Appointment booked successfully!");
            onClose(); // Close modal on success
        } catch (error) {
            toast.error("Failed to book appointment.");
        } finally {
            setBooking(false);
        }
    };

    const handleAddIcdCode = (code: IcdCode) => {
        if (!selectedIcdCodes.find(c => c.id === code.id)) {
            setSelectedIcdCodes([...selectedIcdCodes, code]);
        }
        setIsIcdPopoverOpen(false);
        setIcdQuery("");
    };

    const handleRemoveIcdCode = (codeId: number) => {
        setSelectedIcdCodes(selectedIcdCodes.filter(c => c.id !== codeId));
    };

    const handleWaitlistAdded = () => {
        toast.success("Patient added to waitlist successfully!");
        setShowWaitlist(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {showWaitlist ? "Add Patient to Waitlist" : "Step 3: Select Patient & Confirm"}
                    </DialogTitle>
                </DialogHeader>

                {showWaitlist ? (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
                            <p className="font-medium text-blue-900">No available slots?</p>
                            <p className="text-blue-700 mt-1">
                                Add the patient to the waitlist and they'll be notified when a slot becomes available.
                            </p>
                        </div>
                        <WaitlistManagementPanel
                            doctorId={doctorProfile.user_id}
                            patientId={selectedPatient?.id}
                        />
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => setShowWaitlist(false)}>
                                Back to Booking
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600">
                                Select a patient to book this appointment
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowWaitlist(true)}
                                className="text-blue-600 hover:text-blue-700"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add to Waitlist
                            </Button>
                        </div>
                        <Input type="text" placeholder="Search patients by name or ID..." value={patientQuery} onChange={e => setPatientQuery(e.target.value)} />
                        <Card className="max-h-[200px] overflow-y-auto">
                            {patients.map((p, i) => (
                                <div key={p.user_id} ref={i === patients.length - 1 ? lastPatientRef : null} onClick={() => setSelectedPatient(p)}
                                    className={`p-3 cursor-pointer flex items-center gap-3 ${selectedPatient?.user_id === p.user_id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                                    <Image src={"/placeholder-user.jpg"} width={48} height={48} alt={p.full_name} className="h-12 w-12 rounded-full" />
                                    <div>
                                        <p className="font-semibold">{p.full_name}</p>
                                        <p className="text-sm text-gray-500">ID: {p.user_id} - {p.email}</p>
                                    </div>
                                </div>
                            ))}
                            {patientLoading && <div className="flex justify-center p-4"><InfinitySpin width="40" color="#388fe5" /></div>}
                        </Card>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="reason">Reason For Visit</Label>
                                <Input id="reason" value={reasonForVisit} onChange={e => setReasonForVisit(e.target.value)} />
                            </div>
                            <div className="relative">
                                <Label htmlFor="icd-code">ICD-10 Codes (Optional - Multiple)</Label>

                                {/* Selected ICD Codes */}
                                {selectedIcdCodes.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-md">
                                        {selectedIcdCodes.map((code) => (
                                            <div key={code.id} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                                                <span className="font-semibold">{code.code}</span>
                                                <span className="text-xs">- {code.description.substring(0, 30)}...</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveIcdCode(code.id)}
                                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                                >
                                                    <CircleX className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <Input
                                    id="icd-code"
                                    placeholder="Search by code or description (e.g., 'diabetes', 'E11')"
                                    value={icdQuery}
                                    onChange={(e) => setIcdQuery(e.target.value)}
                                    autoComplete="off"
                                />
                                {isIcdPopoverOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg">
                                        {isIcdLoading ? (
                                            <div className="p-4 text-center flex items-center justify-center gap-2 text-sm">
                                                <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                                            </div>
                                        ) : icdResults.length > 0 ? (
                                            <div className="max-h-60 overflow-y-auto">
                                                {icdResults.map((code) => (
                                                    <div
                                                        key={code.id}
                                                        className={`p-2 hover:bg-gray-100 cursor-pointer text-sm ${selectedIcdCodes.find(c => c.id === code.id) ? 'bg-blue-50' : ''
                                                            }`}
                                                        onClick={() => handleAddIcdCode(code)}
                                                    >
                                                        <span className="font-semibold">{code.code}</span> - {code.description}
                                                        {selectedIcdCodes.find(c => c.id === code.id) && (
                                                            <span className="ml-2 text-blue-600 text-xs">✓ Added</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-4 text-center text-sm text-gray-500">No results found.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-3 rounded-md bg-gray-100 space-y-2 text-sm">
                            <div className="flex items-center"><User className="h-4 w-4 mr-2" />{doctorProfile.first_name} {doctorProfile.last_name}</div>
                            <div className="flex items-center"><Calendar className="h-4 w-4 mr-2" />{new Date(selectedSlot.start_time).toLocaleDateString()}</div>
                            <div className="flex items-center"><Clock className="h-4 w-4 mr-2" />{selectedSlot.duration} min</div>
                            <div className="flex items-center"><User className="h-4 w-4 mr-2" />Patient: {selectedPatient?.full_name || 'Not selected'}</div>
                        </div>
                        <div className="flex items-center space-x-2"><Checkbox id="telehealth" checked={isTelehealth} onCheckedChange={c => setIsTelehealth(!!c)} /><Label htmlFor="telehealth">Is Telehealth?</Label></div>
                        <DialogFooter>
                            <Button variant="outline" onClick={onClose}><CircleX className="h-4 w-4 mr-2" />Cancel</Button>
                            <Button className="bg-green-primary" onClick={handleBookAppointment} disabled={booking}><CircleCheckBig className="h-4 w-4 mr-2" />{booking ? "Booking..." : "Confirm & Book"}</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}