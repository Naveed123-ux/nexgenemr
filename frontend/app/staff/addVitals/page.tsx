"use client";
import React, { useState } from "react";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-hot-toast";
import { useSelector } from "react-redux";
import { AddVitals, AddMedicalHistory } from "@/app/_apis/staff/receptionist";
import * as z from "zod";
import {
  Heart,
  Wind,
  Thermometer,
  Gauge,
  AlertTriangle,
  Pill,
  History,
  Save,
  PlusCircle,
  X,
  User,
  ClipboardPlus,
  Stethoscope,
} from "lucide-react";

// --- Real ShadCN UI Imports ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { privateApi } from "@/lib/axios";
import { RootState } from "@/store/store";
import { VitalSignsPayload, MedicalHistoryPayload } from "@/hooks/types/types";

// --- TypeScript Interfaces for API Payloads ---

// Interface for the vitals data based on your curl command

interface ListItem {
  id: number;
  name: string;
}

// --- Zod Validation Schema (Client-side) ---
// This schema is slightly different from the API payload to allow for number coercion
const vitalsSchema = z.object({
  bloodPressure: z
    .string()
    .regex(/^\d{2,3}\/\d{2,3}$/, "Invalid format (e.g., 120/80)"),
  heartRate: z.coerce.number().min(30, "Too low").max(220, "Too high"),
  respiratoryRate: z.coerce.number().min(5, "Too low").max(50, "Too high"),
  temperature: z.coerce.number().min(35, "Too low").max(43, "Too high"),
  oxygenSaturation: z.coerce.number().min(80, "Too low").max(100, "Too high"),
  painLevel: z.coerce.number().min(0).max(10, "Must be 0-10"),
});
type VitalsFormValues = z.infer<typeof vitalsSchema>;

// --- Main Patient Record Component ---
export default function PatientRecordPage() {
  const [activeTab, setActiveTab] = useState("vitals");
  const singAppt = useSelector(
    (state: RootState) => state.allStaff.singleAppointmentSelected
  );
  // State for dynamic lists
  const [allergies, setAllergies] = useState<ListItem[]>([
    { id: 1, name: "Pollen" },
  ]);
  const [medications, setMedications] = useState<ListItem[]>([
    { id: 1, name: "Lisinopril 10mg" },
  ]);
  const [history, setHistory] = useState<ListItem[]>([
    { id: 1, name: "Appendectomy (2003)" },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VitalsFormValues>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      bloodPressure: "120/80",
      heartRate: 72,
      respiratoryRate: 16,
      temperature: 36.8,
      oxygenSaturation: 98,
      painLevel: 2,
    },
  });

  const onVitalsSubmit: SubmitHandler<VitalsFormValues> = async (data) => {
    // 1. Transform form data to match the API payload interface
    const payload: VitalSignsPayload = {
      blood_pressure: data.bloodPressure,
      heart_rate: data.heartRate,
      respiratory_rate: data.respiratoryRate,
      temperature: data.temperature,
      oxygen_saturation: data.oxygenSaturation,
      pain_level: String(data.painLevel), // Convert number to string for API
    };

    // 2. Simulate the API call

    let toastId = toast.loading("Submitting Vitals ");
    try {
      if (singAppt?.id) {
        const response = await AddVitals(payload, singAppt?.id);
        console.log(response);
      }
      toast.success("Succesfully submitted Vitals");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message, { id: toastId });
        console.error("Failed to save Vitals :", error);
      } else {
        toast.error("error submitting Vitals", { id: toastId });
      }
    }
  };

  const onMedicalHistorySubmit = async () => {
    // 1. Transform state data to match the API payload interface
    const payload: MedicalHistoryPayload = {
      allergies: allergies.map((item) => item.name),
      current_medications: medications.map((item) => item.name),
      past_medical_history: history.map((item) => item.name),
    };
    let toastId = toast.loading("Submitting medical history");
    try {
      if (singAppt?.id) {
        const response = await AddMedicalHistory(payload, singAppt.id);
        console.log("response", response);
      }
      toast.success("succesfully submitted Medical History", { id: toastId });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message, { id: toastId });
        console.error("Failed to save medical history:", error);
      } else {
        toast.error("error submitting medicalHistory", { id: toastId });
      }
    }
  };

  const addListItem = (
    list: ListItem[],
    setList: React.Dispatch<React.SetStateAction<ListItem[]>>,
    inputId: string
  ) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input && input.value.trim()) {
      setList([...list, { id: Date.now(), name: input.value.trim() }]);
      input.value = "";
    }
  };

  const removeListItem = (
    list: ListItem[],
    setList: React.Dispatch<React.SetStateAction<ListItem[]>>,
    id: number
  ) => {
    setList(list.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-6 p-4 md:p-8 bg-[#F7F9FC] dark:bg-background-dark">
      {/* Patient Header */}
      <Card className="flex flex-col sm:flex-row items-start sm:items-center p-6">
        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 mb-4 sm:mb-0 sm:mr-6">
          <User className="w-10 h-10 text-slate-400 dark:text-zinc-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {singAppt?.patient_name ? singAppt?.patient_name : "Sophia Clark"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            32 years old, DOB: 05/12/1991
          </p>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            <span className="font-medium text-slate-600 dark:text-zinc-300">
              Reason for visit:
            </span>{" "}
            {singAppt?.reason_for_visit
              ? singAppt?.reason_for_visit
              : "Annual Check-up"}
          </p>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-zinc-700">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab("vitals")}
            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-semibold text-sm focus:outline-none ${activeTab === "vitals"
                ? "border-green-primary text-green-primary"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
          >
            Record Vitals (Today's Visit)
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-semibold text-sm focus:outline-none ${activeTab === "history"
                ? "border-green-primary text-green-primary"
                : "border-transparent text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
          >
            Review Medical History
          </button>
        </nav>
      </div>

      {/* Vitals Tab Content */}
      {activeTab === "vitals" && (
        <Card>
          <form onSubmit={handleSubmit(onVitalsSubmit)}>
            <CardContent className="pt-6">
              {Object.keys(errors).length > 0 && (
                <div
                  className="p-4 mb-6 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 dark:text-red-300"
                  role="alert"
                >
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="font-semibold">
                      Please correct the errors below to continue.
                    </span>
                  </div>
                  <ul className="mt-2 list-disc list-inside pl-2 space-y-1">
                    {Object.entries(errors).map(([key, error]) => (
                      <li key={key}>{error?.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <VitalInput
                  name="bloodPressure"
                  label="Blood Pressure (mmHg)"
                  icon={<Stethoscope size={20} className="text-slate-400" />}
                  register={register}
                  error={errors.bloodPressure}
                />
                <VitalInput
                  name="heartRate"
                  label="Heart Rate (bpm)"
                  icon={<Heart size={20} className="text-slate-400" />}
                  register={register}
                  error={errors.heartRate}
                  type="number"
                  step="1"
                />
                <VitalInput
                  name="respiratoryRate"
                  label="Respiratory Rate (breaths/min)"
                  icon={<Wind size={20} className="text-slate-400" />}
                  register={register}
                  error={errors.respiratoryRate}
                  type="number"
                  step="1"
                />
                <VitalInput
                  name="temperature"
                  label="Temperature (°C)"
                  icon={<Thermometer size={20} className="text-slate-400" />}
                  register={register}
                  error={errors.temperature}
                  type="number"
                  step="0.1"
                />
                <VitalInput
                  name="oxygenSaturation"
                  label="Oxygen Saturation (%)"
                  icon={<Gauge size={20} className="text-slate-400" />}
                  register={register}
                  error={errors.oxygenSaturation}
                  type="number"
                  step="1"
                />
                <VitalInput
                  name="painLevel"
                  label="Pain Level (0-10)"
                  icon={<AlertTriangle size={20} className="text-slate-400" />}
                  register={register}
                  error={errors.painLevel}
                  type="number"
                  step="1"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="gap-2 px-4 py-2">
                <Save size={16} /> Save Vitals
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Medical History Tab Content */}
      {activeTab === "history" && <PastAppointmentsCard />}

      {/* ALWAYS VISIBLE Medical Information */}
      <div className="space-y-6">
        <MedicalListCard
          title="Allergies"
          items={allergies}
          onAdd={() => addListItem(allergies, setAllergies, "allergy-input")}
          onRemove={(id: number) => removeListItem(allergies, setAllergies, id)}
          inputId="allergy-input"
          placeholder="Type to add allergy..."
          icon={<AlertTriangle size={16} />}
          badgeVariant="destructive"
        />
        <MedicalListCard
          title="Current Medications"
          items={medications}
          onAdd={() =>
            addListItem(medications, setMedications, "medication-input")
          }
          onRemove={(id: number) =>
            removeListItem(medications, setMedications, id)
          }
          inputId="medication-input"
          placeholder="Type to add medication..."
          icon={<Pill size={16} />}
          badgeVariant="default"
        />
        <MedicalListCard
          title="Past Medical History"
          items={history}
          onAdd={() => addListItem(history, setHistory, "history-input")}
          onRemove={(id: number) => removeListItem(history, setHistory, id)}
          inputId="history-input"
          placeholder="Type to add medical history..."
          icon={<History size={16} />}
          badgeVariant="secondary"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onMedicalHistorySubmit} className="gap-2 px-4 py-2">
          <ClipboardPlus size={16} /> Save Medical History
        </Button>
      </div>
    </div>
  );
}

// --- Helper Components ---

const VitalInput = ({
  name,
  label,
  icon,
  register,
  error,
  type = "text",
  ...props
}: any) => (
  <div className="space-y-1.5">
    <Label htmlFor={name}>{label}</Label>
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        {icon}
      </div>
      <Input
        id={name}
        type={type}
        className="pl-10"
        {...register(name)}
        {...props}
      />
    </div>
    {error && <p className="text-sm text-red-500 pt-1">{error.message}</p>}
  </div>
);

const MedicalListCard = ({
  title,
  items,
  onAdd,
  onRemove,
  inputId,
  placeholder,
  icon,
  badgeVariant,
}: any) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex flex-wrap gap-3 ">
        {items.map((item: ListItem) => (
          <Badge key={item.id} variant={badgeVariant}>
            {React.cloneElement(icon, { className: "mr-1.5" })}
            <span className="font-medium">{item.name}</span>
            <button
              onClick={() => onRemove(item.id)}
              className="flex-shrink-0 ml-2 p-0.5 rounded-full inline-flex items-center justify-center text-current/70 hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none"
            >
              <span className="sr-only">Remove</span>
              <X size={12} />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <Input
          id={inputId}
          placeholder={placeholder}
          className="pr-12 bg-slate-100 dark:bg-zinc-800"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <button
            type="button"
            onClick={onAdd}
            className="p-1 text-green-primary/80 hover:opacity-80-primary"
          >
            <PlusCircle className="w-6 h-6" />
          </button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const PastAppointmentsCard = () => {
  const appointments = [
    {
      id: 1,
      date: "2023-08-15",
      doctor: "Dr. Emily Carter",
      reason: "Follow-up",
    },
    {
      id: 2,
      date: "2023-01-20",
      doctor: "Dr. John Adams",
      reason: "Annual Check-up",
    },
    {
      id: 3,
      date: "2022-05-10",
      doctor: "Dr. Emily Carter",
      reason: "Flu Symptoms",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Past Appointments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flow-root">
          <ul
            role="list"
            className="-my-4 divide-y divide-slate-200 dark:divide-zinc-700"
          >
            {appointments.map((appointment) => (
              <li
                key={appointment.id}
                className="flex items-center py-4 space-x-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                    {appointment.reason}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 truncate">
                    Dr. {appointment.doctor}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                    {appointment.date}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
