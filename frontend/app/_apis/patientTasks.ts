import { privateApi } from "@/lib/axios";

// Types
export interface PatientTask {
  id: number;
  patient_user_id: number;
  task_description: string;
  is_completed: boolean;
  created_by_user_id: number;
  task_group_id: string;
  task_order: number;
  created_at: string;
  completed_at: string | null;
}

export interface TaskGroup {
  task_group_id: string;
  tasks: PatientTask[];
  all_completed: boolean;
  created_at: string;
}

export interface CanGenerateResponse {
  can_generate: boolean;
  message: string;
}

// Generate 4 AI tasks for a patient
export async function generatePatientTasks(patientUserId: number): Promise<TaskGroup> {
  const response = await privateApi.post<TaskGroup>("/patient-tasks/generate", {
    patient_user_id: patientUserId,
  });
  return response.data;
}

// Get current task group for a patient
export async function getPatientTasks(patientUserId: number): Promise<TaskGroup | null> {
  try {
    const response = await privateApi.get<TaskGroup>(`/patient-tasks/patient/${patientUserId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null; // No tasks yet
    }
    throw error;
  }
}

// Update task completion status
export async function updateTaskCompletion(
  taskId: number,
  isCompleted: boolean
): Promise<PatientTask> {
  const response = await privateApi.patch<PatientTask>(`/patient-tasks/${taskId}`, {
    is_completed: isCompleted,
  });
  return response.data;
}

// Check if new tasks can be generated
export async function canGenerateTasks(patientUserId: number): Promise<CanGenerateResponse> {
  const response = await privateApi.get<CanGenerateResponse>(
    `/patient-tasks/can-generate/${patientUserId}`
  );
  return response.data;
}
