"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { DoctorSelectionTable } from "./DoctorSelectionTable";
import AppointmentScheduler from "../../_components/AppointmentScheduler";
import { DoctorProfile, SlotWithExtras } from "./types";
import { AppointmentBookingModal } from "./AppointmentBookingModal";

export function ScheduleAppointmentView() {
    const [selectedDoctor, setSelectedDoctor] = useState<DoctorProfile | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<SlotWithExtras | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDoctorSelect = (doctor: DoctorProfile) => {
        setSelectedDoctor(doctor);
    };

    const handleSlotSelect = (slotData: SlotWithExtras) => {
        setSelectedSlot(slotData);
        setIsModalOpen(true);
    };

    return (
        <Card>
            <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Schedule New Appointment</h2>
                {selectedDoctor ? (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <Card className="py-3 px-4 bg-blue-50 border-blue-200">
                                <div className="flex gap-3 items-center">
                                    <Image
                                        src={selectedDoctor.profile_picture_url || "/default-avatar.png"}
                                        alt={selectedDoctor.first_name}
                                        width={40} height={40} className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <div>
                                        <h4 className="font-semibold text-blue-800">{selectedDoctor.first_name} {selectedDoctor.last_name}</h4>
                                        <p className="text-xs text-blue-600">{selectedDoctor.specialization}</p>
                                    </div>
                                </div>
                            </Card>
                            <Button variant="outline" onClick={() => setSelectedDoctor(null)}>Change Doctor</Button>
                        </div>
                        <AppointmentScheduler selectedDoctor={selectedDoctor.user_id} onSlotSelect={handleSlotSelect} />
                    </>
                ) : (
                    <DoctorSelectionTable onDoctorSelect={handleDoctorSelect} />
                )}
            </CardContent>
            {selectedDoctor && selectedSlot && (
                <AppointmentBookingModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    selectedSlot={selectedSlot}
                    doctorProfile={selectedDoctor}
                />
            )}
        </Card>
    );
}