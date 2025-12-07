"use client";

import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Book,
  Clock,
  Edit,
  ExternalLink,
  FileText,
  MoreVertical,
  Trash2,
  Video,
  Stethoscope,
  User,
  Calendar,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { selectPaitentForSoap } from "@/store/slices/patientSlice";
import { cancelAppointment } from "@/store/slices/appointmentSlice";
import { UpcomingAppointment } from "./types";
import { UpdateResultsDialog } from "./UpdateResultsDialog";
import { RescheduleDialog } from "./RescheduleDialog";
import { AppDispatch } from "@/store/store";
import { SoapNoteDialog } from "./SoapNoteDialog";
import { IcdCodeManager } from "@/components/appointments/IcdCodeManager";
import { useState } from "react";

export const AppointmentCard = ({
  appointment,
}: {
  appointment: UpcomingAppointment;
}) => {
  const [isSoapNoteOpen, setIsSoapNoteOpen] = useState(false);
  const [isIcdManagerOpen, setIsIcdManagerOpen] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();

  const handleCancelAppointment = () => {
    dispatch(cancelAppointment(appointment.id))
      .unwrap()
      .then(() => toast.success("Appointment cancelled successfully", {
        description: "The patient has been notified via email."
      }))
      .catch((error) => toast.error("Failed to cancel appointment", {
        description: error
      }));
  };

  const handleAddSoapNote = () => {
    dispatch(
      selectPaitentForSoap({
        apppointment_id: appointment.id,
        patient_name: appointment.patient_name,
        doctor_name: appointment.doctor_name,
        status: appointment.status,
      })
    );
    router.push("/doctor/soap-notes");
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-2 border-gray-100 hover:border-blue-200">
      <CardHeader className="flex flex-row items-start justify-between bg-gradient-to-r from-blue-50 to-white pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <User className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-lg font-bold text-gray-900">{appointment.patient_name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {appointment.is_telehealth ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 rounded-full">
                <Video className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Telehealth</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 rounded-full">
                <MapPin className="w-3.5 h-3.5 text-[#388fe5]" />
                <span className="text-xs font-medium text-green-700">In-Person</span>
              </div>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-blue-100">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {/* FIX: Each item needing a modal gets its own Dialog wrapper */}
            <DropdownMenuItem onClick={() => setIsIcdManagerOpen(true)}>
              <Stethoscope className="w-4 h-4 mr-2" />
              Manage ICD Codes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/doctor/reschedule-appointment?appointmentId=${appointment.id}`)}>
              <Edit className="w-4 h-4 mr-2" />
              Reschedule
            </DropdownMenuItem>
            {/* <Dialog>
                            <DialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()}><FileText className="w-4 h-4 mr-2" />Update Results</DropdownMenuItem></DialogTrigger>
                            <UpdateResultsDialog appointment={appointment} />
                        </Dialog> */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="text-red-600"
                  onSelect={(e) => e.preventDefault()}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancel
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently cancel the appointment.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Back</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelAppointment}
                    className={buttonVariants({ variant: "destructive" })}
                  >
                    Confirm Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Date & Time</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {format(
                new Date(appointment.start_time),
                "EEE, LLL dd, yyyy 'at' p"
              )}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Reason for Visit</p>
            <p className="text-sm text-gray-900 mt-0.5 leading-relaxed">
              {appointment.reason_for_visit}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 bg-gray-50 border-t pt-4">
        {appointment.google_meet_link && (
          <a
            href={appointment.google_meet_link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "flex-1 sm:flex-none border-blue-300 text-blue-600 hover:bg-blue-50")}
          >
            <Video className="w-4 h-4 mr-2" />
            Join Meet
            <ExternalLink className="w-3 h-3 ml-2" />
          </a>
        )}
        <Dialog open={isSoapNoteOpen} onOpenChange={setIsSoapNoteOpen}>
          <DialogTrigger asChild>
            <Button className="flex-1 sm:flex-none bg-[#388fe5] hover:bg-[#6fb043] text-white">
              <FileText className="w-4 h-4 mr-2" />
              SOAP Note
            </Button>
          </DialogTrigger>
          {/* Pass the state down to the dialog component */}
          {isSoapNoteOpen && <SoapNoteDialog appointment={appointment} />}
        </Dialog>
      </CardFooter>

      {/* ICD Code Manager Dialog */}
      <IcdCodeManager
        isOpen={isIcdManagerOpen}
        onClose={() => setIsIcdManagerOpen(false)}
        appointmentId={appointment.id}
        appointmentDetails={{
          patientName: appointment.patient_name,
          date: format(new Date(appointment.start_time), "LLL dd, yyyy 'at' p")
        }}
      />
    </Card>
  );
};
