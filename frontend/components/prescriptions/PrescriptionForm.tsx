"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useDispatch } from "react-redux";
import { AppDispatch } from "@/store/store";
import { addPrescription } from "@/store/slices/prescriptionSlice";
import { CreatePrescriptionPayload } from "@/hooks/types/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlusCircle, Pill, Calendar as CalendarIcon, FileText, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const formSchema = z.object({
  medication: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  frequency: z.string().min(1, "Frequency is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface PrescriptionFormProps {
  patientProfileId: number;
  appointmentId: number;
}

export function PrescriptionForm({
  patientProfileId,
  appointmentId,
}: PrescriptionFormProps) {
  const dispatch = useDispatch<AppDispatch>();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    const payload: CreatePrescriptionPayload = {
      ...data,
      patient_user_id: patientProfileId,
      appointment_id: appointmentId,
    };

    toast.promise(dispatch(addPrescription(payload)).unwrap(), {
      loading: "Creating prescription...",
      success: "Prescription created successfully!",
      error: (err) => err || "Failed to create prescription.",
    });
    reset();
  };

  return (
    <Card className="shadow-lg border-2 border-gray-100">
      <CardHeader className="bg-gradient-to-r from-green-50 to-white border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#388fe5] rounded-lg">
            <Pill className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Create New Prescription</CardTitle>
            <p className="text-sm text-gray-500 mt-1">Fill in the medication details below</p>
          </div>
        </div>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6 pt-6">
          {/* Medication Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Pill className="h-4 w-4 text-[#388fe5]" />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Medication Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="medication" className="text-sm font-semibold text-gray-700">
                  Medication Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="medication"
                  {...register("medication")}
                  placeholder="e.g., Lisinopril"
                  className={errors.medication ? "border-red-500" : ""}
                />
                {errors.medication && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.medication.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dosage" className="text-sm font-semibold text-gray-700">
                  Dosage <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dosage"
                  {...register("dosage")}
                  placeholder="e.g., 10 mg"
                  className={errors.dosage ? "border-red-500" : ""}
                />
                {errors.dosage && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.dosage.message}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="frequency" className="text-sm font-semibold text-gray-700">
              Frequency <span className="text-red-500">*</span>
            </Label>
            <Input
              id="frequency"
              {...register("frequency")}
              placeholder="e.g., Once daily, Twice daily, Every 8 hours"
              className={errors.frequency ? "border-red-500" : ""}
            />
            {errors.frequency && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.frequency.message}
              </p>
            )}
          </div>
          {/* Duration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <CalendarIcon className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Duration</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date" className="text-sm font-semibold text-gray-700">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register("start_date")}
                  className={errors.start_date ? "border-red-500" : ""}
                />
                {errors.start_date && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.start_date.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date" className="text-sm font-semibold text-gray-700">
                  End Date <span className="text-gray-400">(Optional)</span>
                </Label>
                <Input id="end_date" type="date" {...register("end_date")} />
                <p className="text-xs text-gray-500">Leave empty for ongoing treatment</p>
              </div>
            </div>
          </div>
          {/* Notes Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FileText className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Additional Notes</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-semibold text-gray-700">
                Instructions <span className="text-gray-400">(Optional)</span>
              </Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="e.g., Take with food, Avoid alcohol, Monitor blood pressure..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">Add any special instructions or warnings for the patient</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-gray-50 border-t">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Required fields
            </p>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#388fe5] hover:bg-[#6fb043] text-white px-6"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Prescription
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
