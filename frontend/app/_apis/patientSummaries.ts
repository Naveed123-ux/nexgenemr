import { privateApi } from "@/lib/axios";

// Types
export interface PatientSummary {
  id: number;
  patient_user_id: number;
  doctor_user_id: number;
  hospital_id: number;
  title: string;
  summary_date: string;
  ai_generated_summary: string;
  what_we_found: string;
  what_it_means: string;
  your_diagnosis: string;
  your_treatment_plan: string;
  your_medications: string;
  what_to_watch_for: string;
  next_steps: string;
  lifestyle_tips: string;
  questions_to_ask: string;
  doctor_notes?: string;
  special_instructions?: string;
  pdf_file_path?: string;
  word_file_path?: string;
  is_viewed_by_patient: boolean;
  viewed_at?: string;
  created_at: string;
  updated_at?: string;
  // Additional fields from joins
  patient_name?: string;
  doctor_name?: string;
}

export interface CreatePatientSummaryRequest {
  patient_user_id: number;
  title: string;
  doctor_notes?: string;
  special_instructions?: string;
}

export interface UpdatePatientSummaryRequest {
  title?: string;
  doctor_notes?: string;
  special_instructions?: string;
}

// Create patient summary
export async function createPatientSummary(
  data: CreatePatientSummaryRequest
): Promise<PatientSummary> {
  try {
    const response = await privateApi.post<PatientSummary>("/patient-summaries/", data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to create patient summary");
  }
}

// Get single patient summary
export async function getPatientSummary(summaryId: number): Promise<PatientSummary> {
  try {
    const response = await privateApi.get<PatientSummary>(`/patient-summaries/${summaryId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch patient summary");
  }
}

// Get patient's summaries (by patient user ID)
export async function getPatientSummaries(patientUserId: number): Promise<PatientSummary[]> {
  try {
    const response = await privateApi.get<PatientSummary[]>(
      `/patient-summaries/patient/${patientUserId}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch patient summaries");
  }
}

// Get my summaries (for logged-in patient)
export async function getMySummaries(): Promise<PatientSummary[]> {
  try {
    const response = await privateApi.get<PatientSummary[]>("/patient-summaries/my/summaries");
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch your summaries");
  }
}

// Update patient summary
export async function updatePatientSummary(
  summaryId: number,
  data: UpdatePatientSummaryRequest
): Promise<PatientSummary> {
  try {
    const response = await privateApi.put<PatientSummary>(
      `/patient-summaries/${summaryId}`,
      data
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to update patient summary");
  }
}

// Download PDF
export async function downloadPatientSummaryPDF(summaryId: number): Promise<Blob> {
  try {
    const response = await privateApi.get(`/patient-summaries/${summaryId}/download/pdf`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to download PDF");
  }
}

// Download Word
export async function downloadPatientSummaryWord(summaryId: number): Promise<Blob> {
  try {
    const response = await privateApi.get(`/patient-summaries/${summaryId}/download/word`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to download Word document");
  }
}

// Get recent summaries (Doctor)
export async function getRecentPatientSummaries(limit: number = 20): Promise<PatientSummary[]> {
  try {
    const response = await privateApi.get<PatientSummary[]>(
      `/patient-summaries/doctor/recent?limit=${limit}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch recent summaries");
  }
}

// Get unviewed summaries (Doctor)
export async function getUnviewedPatientSummaries(): Promise<PatientSummary[]> {
  try {
    const response = await privateApi.get<PatientSummary[]>("/patient-summaries/doctor/unviewed");
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch unviewed summaries");
  }
}

// Helper function to trigger download
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
