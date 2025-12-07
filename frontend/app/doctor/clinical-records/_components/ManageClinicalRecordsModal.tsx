// app/doctor/clinical-records/_components/ManageClinicalRecordsModal.tsx

"use client";

import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import { Appointment } from "@/store/slices/appointmentSlice";
import { fetchVitalsHistory, addVitals, fetchMedicalHistory, updateMedicalHistory, resetClinicalData } from "@/store/slices/clinicalDataSlice";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Save, X, Heart, Wind, Thermometer, Gauge, AlertTriangle, Stethoscope, Activity, Calendar } from "lucide-react";

const vitalsSchema = z.object({
    bloodPressure: z.string().regex(/^\d{2,3}\/\d{2,3}$/, "Invalid format (e.g., 120/80)"),
    heartRate: z.coerce.number().min(30).max(220),
    respiratoryRate: z.coerce.number().min(5).max(50),
    temperature: z.coerce.number().min(35).max(43),
    oxygenSaturation: z.coerce.number().min(80).max(100),
    painLevel: z.string().min(1, "Required"),
});
type VitalsFormValues = z.infer<typeof vitalsSchema>;

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment;
}

export function ManageClinicalRecordsModal({ isOpen, onClose, appointment }: ModalProps) {
    const dispatch = useDispatch<AppDispatch>();
    const { vitals, history, status, error } = useSelector((state: RootState) => state.clinicalData);

    const [allergies, setAllergies] = useState<string[]>([]);
    const [medications, setMedications] = useState<string[]>([]);
    const [pastHistory, setPastHistory] = useState<string[]>([]);

    const { register, handleSubmit, formState: { errors } } = useForm<VitalsFormValues>({
        resolver: zodResolver(vitalsSchema)
    });

    useEffect(() => {
        if (isOpen) {
            dispatch(fetchVitalsHistory(appointment.patient_id));
            dispatch(fetchMedicalHistory(appointment.patient_id));
        }
        return () => {
            dispatch(resetClinicalData());
        }
    }, [isOpen, appointment.patient_id, dispatch]);

    useEffect(() => {
        if (history) {
            setAllergies(history.allergies || []);
            setMedications(history.current_medications || []);
            setPastHistory(history.past_medical_history || []);
        }
    }, [history]);

    const onVitalsSubmit: SubmitHandler<VitalsFormValues> = async (data) => {
        const payload = {
            patient_user_id: appointment.patient_id,
            appointment_id: appointment.id,
            vitalsData: {
                blood_pressure: data.bloodPressure,
                heart_rate: data.heartRate,
                respiratory_rate: data.respiratoryRate,
                temperature: data.temperature,
                oxygen_saturation: data.oxygenSaturation,
                pain_level: data.painLevel,
            }
        };
        toast.promise(dispatch(addVitals(payload)).unwrap(), {
            loading: 'Saving vitals...',
            success: 'Vitals saved successfully!',
            error: (err) => err || 'Failed to save vitals.'
        });
    };

    const onHistorySubmit = () => {
        const payload = {
            patient_user_id: appointment.patient_id,
            historyData: {
                allergies: allergies,
                current_medications: medications,
                past_medical_history: pastHistory,
            }
        };
        toast.promise(dispatch(updateMedicalHistory(payload)).unwrap(), {
            loading: 'Saving medical history...',
            success: 'Medical history saved!',
            error: (err) => err || 'Failed to save history.'
        });
    };

    const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, inputId: string) => {
        const input = document.getElementById(inputId) as HTMLInputElement;
        if (input && input.value.trim()) {
            setter(prev => [...prev, input.value.trim()]);
            input.value = "";
        }
    };

    const removeListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, indexToRemove: number) => {
        setter(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="bg-white -mx-6 -mt-6 px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-[#388fe5] to-[#6fb043] rounded-lg">
                            <Stethoscope className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-gray-900">
                                Clinical Records - {appointment.patient_name}
                            </DialogTitle>
                            <p className="text-sm text-gray-500 mt-0.5">
                                Manage vitals and medical history
                            </p>
                        </div>
                    </div>
                </DialogHeader>
                <Tabs defaultValue="vitals" className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 bg-gray-100">
                        <TabsTrigger value="vitals" className="data-[state=active]:bg-[#388fe5] data-[state=active]:text-white">
                            <Activity className="h-4 w-4 mr-2" />
                            Vitals
                        </TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                            <Calendar className="h-4 w-4 mr-2" />
                            Medical History
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="vitals" className="mt-4 overflow-y-auto flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Vitals Form */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-[#388fe5] bg-opacity-20 rounded-lg">
                                        <Activity className="h-4 w-4 text-[#6fb043]" />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900">Add New Vitals</h3>
                                </div>
                                <form onSubmit={handleSubmit(onVitalsSubmit)} className="space-y-4">
                                    <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Heart className="h-4 w-4 text-red-600" />
                                            <Label className="font-semibold text-gray-700">Blood Pressure</Label>
                                        </div>
                                        <Input {...register("bloodPressure")} placeholder="e.g., 120/80" className="bg-white" />
                                        {errors.bloodPressure && <p className="text-red-500 text-xs mt-1">{errors.bloodPressure.message}</p>}
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Heart className="h-4 w-4 text-blue-600" />
                                            <Label className="font-semibold text-gray-700">Heart Rate (bpm)</Label>
                                        </div>
                                        <Input type="number" {...register("heartRate")} placeholder="e.g., 72" className="bg-white" />
                                        {errors.heartRate && <p className="text-red-500 text-xs mt-1">{errors.heartRate.message}</p>}
                                    </div>
                                    <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Wind className="h-4 w-4 text-[#388fe5]" />
                                            <Label className="font-semibold text-gray-700">Respiratory Rate (breaths/min)</Label>
                                        </div>
                                        <Input type="number" {...register("respiratoryRate")} placeholder="e.g., 16" className="bg-white" />
                                        {errors.respiratoryRate && <p className="text-red-500 text-xs mt-1">{errors.respiratoryRate.message}</p>}
                                    </div>
                                    <div className="p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Thermometer className="h-4 w-4 text-orange-600" />
                                            <Label className="font-semibold text-gray-700">Temperature (°C)</Label>
                                        </div>
                                        <Input type="number" step="0.1" {...register("temperature")} placeholder="e.g., 37.0" className="bg-white" />
                                        {errors.temperature && <p className="text-red-500 text-xs mt-1">{errors.temperature.message}</p>}
                                    </div>
                                    <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Gauge className="h-4 w-4 text-purple-600" />
                                            <Label className="font-semibold text-gray-700">Oxygen Saturation (%)</Label>
                                        </div>
                                        <Input type="number" {...register("oxygenSaturation")} placeholder="e.g., 98" className="bg-white" />
                                        {errors.oxygenSaturation && <p className="text-red-500 text-xs mt-1">{errors.oxygenSaturation.message}</p>}
                                    </div>
                                    <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                            <Label className="font-semibold text-gray-700">Pain Level (0-10)</Label>
                                        </div>
                                        <Input {...register("painLevel")} placeholder="e.g., 3" className="bg-white" />
                                        {errors.painLevel && <p className="text-red-500 text-xs mt-1">{errors.painLevel.message}</p>}
                                    </div>
                                    <Button type="submit" disabled={status === 'loading'} className="w-full bg-[#388fe5] hover:bg-[#6fb043]">
                                        <Save className="h-4 w-4 mr-2" /> Save Vitals
                                    </Button>
                                </form>
                            </div>

                            {/* Vitals History */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-teal-100 rounded-lg">
                                        <Calendar className="h-4 w-4 text-teal-600" />
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900">Vitals History</h3>
                                </div>
                                <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                                    {status === 'loading' && <Skeleton className="h-20 w-full" />}
                                    {vitals && vitals.length > 0 ? vitals.map(v => (
                                        <div key={v.vitals.id} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Calendar className="h-4 w-4 text-gray-600" />
                                                <p className="font-bold text-gray-900">{new Date(v.appointment_date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                                                    <Heart className="h-3 w-3 text-red-600" />
                                                    <span className="text-gray-700"><strong>BP:</strong> {v.vitals.blood_pressure}</span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                                                    <Heart className="h-3 w-3 text-blue-600" />
                                                    <span className="text-gray-700"><strong>HR:</strong> {v.vitals.heart_rate} bpm</span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                                                    <Wind className="h-3 w-3 text-[#388fe5]" />
                                                    <span className="text-gray-700"><strong>RR:</strong> {v.vitals.respiratory_rate}</span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                                                    <Thermometer className="h-3 w-3 text-orange-600" />
                                                    <span className="text-gray-700"><strong>Temp:</strong> {v.vitals.temperature}°C</span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-purple-50 rounded">
                                                    <Gauge className="h-3 w-3 text-purple-600" />
                                                    <span className="text-gray-700"><strong>O2:</strong> {v.vitals.oxygen_saturation}%</span>
                                                </div>
                                                <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                                                    <AlertTriangle className="h-3 w-3 text-yellow-600" />
                                                    <span className="text-gray-700"><strong>Pain:</strong> {v.vitals.pain_level}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-12">
                                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-3">
                                                <Activity className="h-8 w-8 text-gray-400" />
                                            </div>
                                            <p className="text-gray-500 font-medium">No vitals history found</p>
                                            <p className="text-sm text-gray-400 mt-1">Add vitals to start tracking</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="history" className="mt-4">
                        {status === 'loading' && <Skeleton className="h-40 w-full" />}
                        {history && <div className="space-y-4">
                            {/* Allergies */}
                            <div>
                                <Label className="font-semibold">Allergies</Label>
                                <div className="flex flex-wrap gap-2 my-2">{allergies.map((item, i) => <span key={i} className="flex items-center text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">{item} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeListItem(setAllergies, i)} /></span>)}</div>
                                <div className="flex gap-2">
                                    <Input id="allergy-input" placeholder="Add allergy..." />
                                    <Button size="icon" variant="outline" onClick={() => addListItem(setAllergies, 'allergy-input')}><PlusCircle className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            {/* Medications */}
                            <div>
                                <Label className="font-semibold">Current Medications</Label>
                                <div className="flex flex-wrap gap-2 my-2">{medications.map((item, i) => <span key={i} className="flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{item} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeListItem(setMedications, i)} /></span>)}</div>
                                <div className="flex gap-2">
                                    <Input id="medication-input" placeholder="Add medication..." />
                                    <Button size="icon" variant="outline" onClick={() => addListItem(setMedications, 'medication-input')}><PlusCircle className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            {/* Past History */}
                            <div>
                                <Label className="font-semibold">Past Medical History</Label>
                                <div className="flex flex-wrap gap-2 my-2">{pastHistory.map((item, i) => <span key={i} className="flex items-center text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">{item} <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => removeListItem(setPastHistory, i)} /></span>)}</div>
                                <div className="flex gap-2">
                                    <Input id="past-history-input" placeholder="Add history..." />
                                    <Button size="icon" variant="outline" onClick={() => addListItem(setPastHistory, 'past-history-input')}><PlusCircle className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <Button onClick={onHistorySubmit} disabled={status === 'loading'}><Save className="h-4 w-4 mr-2" /> Save Medical History</Button>
                        </div>}
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}