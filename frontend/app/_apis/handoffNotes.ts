import { privateApi } from "@/lib/axios";

// Types
export interface HandoffNote {
  id: number;
  patient_user_id: number;
  hospital_id: number;
  created_by_staff_id: number;
  handoff_date: string;
  shift_from: string;
  shift_to: string;
  ai_generated_summary: string;
  patient_overview: string;
  current_condition: string;
  active_problems: string;
  recent_changes: string;
  current_medications: string;
  pending_tasks: string;
  important_alerts: string;
  care_plan: string;
  family_communication: string;
  additional_notes?: string;
  special_instructions?: string;
  pdf_file_path?: string;
  is_acknowledged: boolean;
  acknowledged_by_staff_id?: number;
  acknowledged_at?: string;
  created_at: string;
  updated_at?: string;
  // Additional fields from joins
  patient_name?: string;
  staff_name?: string;
  acknowledged_by_name?: string;
}

export interface CreateHandoffNoteRequest {
  patient_user_id: number;
  shift_from: string;
  shift_to: string;
  additional_notes?: string;
  special_instructions?: string;
}

export interface UpdateHandoffNoteRequest {
  additional_notes?: string;
  special_instructions?: string;
}

// Create handoff note
export async function createHandoffNote(data: CreateHandoffNoteRequest): Promise<HandoffNote> {
  try {
    const response = await privateApi.post<HandoffNote>("/handoff-notes/", data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to create handoff note");
  }
}

// Get single handoff note
export async function getHandoffNote(noteId: number): Promise<HandoffNote> {
  try {
    const response = await privateApi.get<HandoffNote>(`/handoff-notes/${noteId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch handoff note");
  }
}

// Get patient's handoff notes
export async function getPatientHandoffNotes(patientUserId: number): Promise<HandoffNote[]> {
  try {
    const response = await privateApi.get<HandoffNote[]>(`/handoff-notes/patient/${patientUserId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch patient handoff notes");
  }
}

// Update handoff note
export async function updateHandoffNote(
  noteId: number,
  data: UpdateHandoffNoteRequest
): Promise<HandoffNote> {
  try {
    const response = await privateApi.put<HandoffNote>(`/handoff-notes/${noteId}`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to update handoff note");
  }
}

// Acknowledge handoff note
export async function acknowledgeHandoffNote(noteId: number): Promise<HandoffNote> {
  try {
    const response = await privateApi.post<HandoffNote>(`/handoff-notes/${noteId}/acknowledge`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to acknowledge handoff note");
  }
}

// Download PDF
export async function downloadHandoffNotePDF(noteId: number): Promise<Blob> {
  try {
    const response = await privateApi.get(`/handoff-notes/${noteId}/download/pdf`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to download PDF");
  }
}

// Get recent handoffs
export async function getRecentHandoffNotes(limit: number = 20): Promise<HandoffNote[]> {
  try {
    const response = await privateApi.get<HandoffNote[]>(
      `/handoff-notes/hospital/recent?limit=${limit}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch recent handoff notes");
  }
}

// Get unacknowledged handoffs
export async function getUnacknowledgedHandoffNotes(): Promise<HandoffNote[]> {
  try {
    const response = await privateApi.get<HandoffNote[]>("/handoff-notes/hospital/unacknowledged");
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch unacknowledged handoff notes");
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
