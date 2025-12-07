"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeftRight,
  Calendar,
  Clock,
  User,
  Video,
  MapPin,
  AlertCircle,
  Loader2
} from "lucide-react";
import { UpcomingAppointment } from "./types";
import { useSwapAppointment } from "./SwapAppointmentContext";
import { AppDispatch } from "@/store/store";
import { fetchWeeklyAppointments } from "@/store/slices/appointmentSlice";
import { privateApi } from "@/lib/axios";

interface SwapConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  secondAppointment: UpcomingAppointment;
}

export function SwapConfirmationDialog({
  isOpen,
  onClose,
  secondAppointment,
}: SwapConfirmationDialogProps) {
  const { firstAppointment, cancelSwapMode } = useSwapAppointment();
  const [isSwapping, setIsSwapping] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  if (!firstAppointment) return null;

  const handleSwap = async () => {
    setIsSwapping(true);

    console.log("Swapping appointments:");
    console.log("First appointment:", firstAppointment);
    console.log("Second appointment:", secondAppointment);
    console.log("Request payload:", {
      appointment_id_1: firstAppointment.id,
      appointment_id_2: secondAppointment.id,
    });

    try {
      const response = await privateApi.post("/appointments/swap", {
        appointment_id_1: firstAppointment.id,
        appointment_id_2: secondAppointment.id,
      });

      toast.success("Appointments swapped successfully!", {
        description: "Both patients have been notified via email.",
      });

      // Refresh appointments
      const startDate = format(new Date(), "yyyy-MM-dd");
      dispatch(fetchWeeklyAppointments(startDate));

      cancelSwapMode();
      onClose();
    } catch (error: any) {
      console.error("Swap error:", error);
      console.error("Error response:", error.response);
      console.error("Error detail:", error.response?.data?.detail);

      const errorMessage = error.response?.data?.detail || "Please try again.";

      toast.error("Failed to swap appointments", {
        description: errorMessage,
      });
    } finally {
      setIsSwapping(false);
    }
  };

  const handleCancel = () => {
    cancelSwapMode();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" />
            Confirm Appointment Swap
          </DialogTitle>
          <DialogDescription>
            Review the appointment swap details before confirming. Both patients will be notified via email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* First Appointment */}
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <User className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">
                {firstAppointment.patient_name}
              </h3>
            </div>
            <div className="space-y-2 ml-10">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {format(new Date(firstAppointment.start_time), "EEE, LLL dd, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {format(new Date(firstAppointment.start_time), "p")} - {format(new Date(firstAppointment.end_time), "p")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {firstAppointment.is_telehealth ? (
                  <>
                    <Video className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-700 font-medium">Telehealth</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-[#388fe5]" />
                    <span className="text-green-700 font-medium">In-Person</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Swap Arrow */}
          <div className="flex justify-center">
            <div className="p-3 bg-gray-100 rounded-full">
              <ArrowLeftRight className="w-6 h-6 text-gray-600" />
            </div>
          </div>

          {/* Second Appointment */}
          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <User className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">
                {secondAppointment.patient_name}
              </h3>
            </div>
            <div className="space-y-2 ml-10">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {format(new Date(secondAppointment.start_time), "EEE, LLL dd, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {format(new Date(secondAppointment.start_time), "p")} - {format(new Date(secondAppointment.end_time), "p")}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {secondAppointment.is_telehealth ? (
                  <>
                    <Video className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-700 font-medium">Telehealth</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 text-[#388fe5]" />
                    <span className="text-green-700 font-medium">In-Person</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Warning Alert */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Important:</strong> Both patients will receive email notifications about the time change.
              {(firstAppointment.is_telehealth || secondAppointment.is_telehealth) &&
                " Google Meet links will be updated for telehealth appointments."}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSwapping}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSwap}
            disabled={isSwapping}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSwapping ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Swapping...
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Confirm Swap
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
