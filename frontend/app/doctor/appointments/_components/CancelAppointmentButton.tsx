"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, AlertCircle } from "lucide-react";
import { privateApi } from "@/lib/axios";
import { AppDispatch } from "@/store/store";
import { fetchWeeklyAppointments } from "@/store/slices/appointmentSlice";
import { format } from "date-fns";

interface CancelAppointmentButtonProps {
  appointmentId: number;
  patientName: string;
  appointmentTime: string;
  onSuccess?: () => void;
}

export function CancelAppointmentButton({
  appointmentId,
  patientName,
  appointmentTime,
  onSuccess,
}: CancelAppointmentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  const handleCancel = async () => {
    setIsCancelling(true);

    try {
      await privateApi.delete(`/appointments/appointment/${appointmentId}`);

      toast.success("Appointment cancelled successfully. The patient has been notified via email.");

      // Refresh appointments
      const startDate = format(new Date(), "yyyy-MM-dd");
      dispatch(fetchWeeklyAppointments(startDate));

      setIsOpen(false);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Cancel error:", error);

      const errorMessage = error.response?.data?.detail || "Failed to cancel appointment. Please try again.";

      toast.error(`Failed to cancel appointment: ${errorMessage}`);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Cancel
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl">
                Cancel Appointment?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-3 pt-2">
              <p>
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </p>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-500 min-w-[80px]">Patient:</span>
                  <span className="text-sm font-semibold text-gray-900">{patientName}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-500 min-w-[80px]">Time:</span>
                  <span className="text-sm font-semibold text-gray-900">{appointmentTime}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The patient will be automatically notified via email about this cancellation.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Keep Appointment
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Yes, Cancel Appointment
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
