"use client";

import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { RootState } from "@/store/store";
import {
  fetchDoctorAvailableSlots,
  fetchMyAvailableSlots,
  blockAppointmentSlot,
  unblockAppointmentSlot,
} from "@/store/slices/sessionsSlice";
import type { SlotResponse } from "@/lib/session-api-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Phone, Video, Loader2 } from "lucide-react";
import { format } from "date-fns";

/**
 * Example component showing how to fetch and display available slots
 * for appointment booking using the new slot-based API
 */
export default function AppointmentBookingExample() {
  const dispatch = useAppDispatch();
  const {
    doctorAvailableSlots,
    doctorAvailableSlotsStatus,
    doctorAvailableSlotsError,
  } = useAppSelector((state: RootState) => state.sessions);

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedSlot, setSelectedSlot] = useState<SlotResponse | null>(null);
  const [groupBySession, setGroupBySession] = useState(false);

  // Fetch available slots when component mounts or date changes
  useEffect(() => {
    // Example: Fetch slots for a specific doctor
    // Replace 123 with actual doctor ID from your app context
    const doctorId = 123;

    dispatch(
      fetchDoctorAvailableSlots({
        doctorId,
        startDate: selectedDate,
        onlyAvailable: true, // Only show unblocked and unbooked slots
      })
    );
  }, [dispatch, selectedDate]);

  // Filter slots by modality
  const faceToFaceSlots = doctorAvailableSlots.filter(
    (slot: SlotResponse) => slot.modality === "face_to_face"
  );
  const telephoneSlots = doctorAvailableSlots.filter(
    (slot: SlotResponse) => slot.modality === "telephone"
  );
  const homeVisitSlots = doctorAvailableSlots.filter(
    (slot: SlotResponse) => slot.modality === "home_visit"
  );

  // Group slots by session if needed
  const slotsBySession = doctorAvailableSlots.reduce((acc: Record<number, SlotResponse[]>, slot: SlotResponse) => {
    if (!acc[slot.session_id]) {
      acc[slot.session_id] = [];
    }
    acc[slot.session_id].push(slot);
    return acc;
  }, {} as Record<number, SlotResponse[]>);

  // Format slot time for display
  const formatSlotTime = (slot: SlotResponse) => {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
    return {
      date: format(start, "MMM dd, yyyy"),
      time: `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
      duration: `${slot.duration} min`,
    };
  };

  // Get modality icon
  const getModalityIcon = (modality: string | null) => {
    switch (modality) {
      case "face_to_face":
        return <MapPin className="h-4 w-4" />;
      case "telephone":
        return <Phone className="h-4 w-4" />;
      case "home_visit":
        return <Video className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  // Get modality label
  const getModalityLabel = (modality: string | null) => {
    switch (modality) {
      case "face_to_face":
        return "In-Person";
      case "telephone":
        return "Phone";
      case "home_visit":
        return "Home Visit";
      default:
        return "Unknown";
    }
  };

  // Handle slot selection
  const handleSlotSelect = (slot: SlotResponse) => {
    setSelectedSlot(slot);
  };

  // Handle booking (you would implement actual booking logic here)
  const handleBookAppointment = async () => {
    if (!selectedSlot) return;

    try {
      // Example booking payload using the NEW slot-based API
      const bookingData = {
        appointment_slot_id: selectedSlot.id, // ✅ Use slot ID, not session ID
        patient_user_id: 456, // Replace with actual patient ID
        reason_for_visit: "Regular checkup",
        is_telehealth: selectedSlot.modality === "telephone",
      };

      // Make API call to book appointment
      // const response = await fetch('/api/appointments/', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(bookingData)
      // });

      console.log("Booking appointment with data:", bookingData);
      alert("Appointment booked successfully!");
      setSelectedSlot(null);

      // Refresh slots after booking
      dispatch(
        fetchDoctorAvailableSlots({
          doctorId: 123,
          startDate: selectedDate,
          onlyAvailable: true,
        })
      );
    } catch (error) {
      console.error("Failed to book appointment:", error);
      alert("Failed to book appointment");
    }
  };

  // Render slot card
  const renderSlotCard = (slot: SlotResponse) => {
    const { date, time, duration } = formatSlotTime(slot);
    const isSelected = selectedSlot?.id === slot.id;

    return (
      <Card
        key={slot.id}
        className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? "border-[#388fe5] border-2 bg-[#388fe5]/5" : ""
          }`}
        onClick={() => handleSlotSelect(slot)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getModalityIcon(slot.modality)}
                <span className="font-medium">
                  {slot.title || "Available Slot"}
                </span>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {duration}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {getModalityLabel(slot.modality)}
                  </Badge>
                </div>
              </div>

              {slot.label && (
                <p className="text-xs text-gray-500 mt-2">{slot.label}</p>
              )}
            </div>

            {isSelected && (
              <div className="ml-2">
                <Badge className="bg-[#388fe5]">Selected</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Book an Appointment</h2>
        <p className="text-gray-600">
          Select an available time slot to book your appointment
        </p>
      </div>

      {/* Date Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Date</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="px-4 py-2 border rounded-md"
          />
        </CardContent>
      </Card>

      {/* View Options */}
      <div className="flex gap-2">
        <Button
          variant={groupBySession ? "outline" : "default"}
          onClick={() => setGroupBySession(false)}
          size="sm"
        >
          All Slots
        </Button>
        <Button
          variant={groupBySession ? "default" : "outline"}
          onClick={() => setGroupBySession(true)}
          size="sm"
        >
          Group by Session
        </Button>
      </div>

      {/* Loading State */}
      {doctorAvailableSlotsStatus === "loading" && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#388fe5]" />
        </div>
      )}

      {/* Error State */}
      {doctorAvailableSlotsStatus === "failed" && doctorAvailableSlotsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{doctorAvailableSlotsError.message}</p>
          </CardContent>
        </Card>
      )}

      {/* Available Slots */}
      {doctorAvailableSlotsStatus === "succeeded" && (
        <>
          {doctorAvailableSlots.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No available slots for this date</p>
                <p className="text-sm mt-2">
                  Try selecting a different date or check back later
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-[#388fe5]">
                      {doctorAvailableSlots.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Slots</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-blue-600">
                      {faceToFaceSlots.length}
                    </div>
                    <div className="text-sm text-gray-600">In-Person</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-purple-600">
                      {telephoneSlots.length}
                    </div>
                    <div className="text-sm text-gray-600">Phone</div>
                  </CardContent>
                </Card>
              </div>

              {/* Slots Display */}
              {!groupBySession ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {doctorAvailableSlots.map(renderSlotCard)}
                </div>
              ) : (
                <div className="space-y-6">
                  {(Object.entries(slotsBySession) as [string, SlotResponse[]][]).map(
                    ([sessionId, sessionSlots]) => (
                      <Card key={sessionId}>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Session {sessionId}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sessionSlots.map(renderSlotCard)}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Selected Slot Actions */}
      {selectedSlot && (
        <Card className="border-[#388fe5] bg-[#388fe5]/5">
          <CardHeader>
            <CardTitle className="text-lg">Confirm Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Selected Slot:</p>
                <div className="font-medium">
                  {formatSlotTime(selectedSlot).date} at{" "}
                  {formatSlotTime(selectedSlot).time}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {getModalityLabel(selectedSlot.modality)} •{" "}
                  {formatSlotTime(selectedSlot).duration}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleBookAppointment}
                  className="bg-[#388fe5] hover:bg-[#6FB844]"
                >
                  Confirm Booking
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedSlot(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
