// app/_apis/doctor/clinicalData.ts

import { privateApi } from "@/lib/axios";
import { isAxiosError } from "axios";

// --- PAYLOAD TYPES ---
interface VitalsData {
    blood_pressure: string;
    heart_rate: number;
    respiratory_rate: number;
    temperature: number;
    oxygen_saturation: number;
    pain_level: string;
}

interface MedicalHistoryData {
    allergies: string[];
    current_medications: string[];
    past_medical_history: string[];
}


// --- API FUNCTIONS ---

export const addVitalsForAppointment = async (patientUserId: number, appointmentId: number, data: VitalsData) => {
    try {
        const response = await privateApi.post(`/clinical-data/vitals/patient/${patientUserId}/appointment/${appointmentId}`, data);
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || "Failed to add vitals.");
        }
        throw new Error("An unknown error occurred while adding vitals.");
    }
};

export const getVitalsHistoryForPatient = async (patientUserId: number) => {
    try {
        const response = await privateApi.get(`/clinical-data/vitals/patient/${patientUserId}`);
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
             // If 404, return empty array as it's not a critical error
            if (error.response?.status === 404) return [];
            throw new Error(error.response?.data?.detail || "Failed to fetch vitals history.");
        }
        throw new Error("An unknown error occurred while fetching vitals history.");
    }
};


export const updateMedicalHistory = async (patientUserId: number, data: MedicalHistoryData) => {
    try {
        const response = await privateApi.post(`/clinical-data/history/patient/${patientUserId}`, data);
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            throw new Error(error.response?.data?.detail || "Failed to update medical history.");
        }
        throw new Error("An unknown error occurred while updating medical history.");
    }
};

export const getMedicalHistory = async (patientUserId: number) => {
    try {
        const response = await privateApi.get(`/clinical-data/history/patient/${patientUserId}`);
        return response.data;
    } catch (error) {
        if (isAxiosError(error)) {
            // If 404, return a default empty structure
            if (error.response?.status === 404) return { allergies: [], current_medications: [], past_medical_history: [] };
            throw new Error(error.response?.data?.detail || "Failed to fetch medical history.");
        }
        throw new Error("An unknown error occurred while fetching medical history.");
    }
};