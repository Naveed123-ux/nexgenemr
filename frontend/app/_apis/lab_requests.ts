import { privateApi } from "@/lib/axios";

export interface BrainTumorResult {
    id: number;
    image_url: string;
    result_class: string;
    confidence: number;
    created_at: string;
}

export interface LabRequest {
    id: number;
    patient_id: number;
    doctor_id: number;
    lab_tech_id: number | null;
    appointment_id: number | null;
    request_type: string;
    status: "PENDING" | "ACCEPTED" | "COMPLETED" | "APPROVED" | "REJECTED";
    priority: string;
    notes: string | null;
    doctor_comment: string | null;
    doctor_rating: number | null;
    created_at: string;
    updated_at: string;
    patient_name?: string;
    appointment_time?: string;
    brain_tumor_result?: BrainTumorResult;
}

export interface PaginatedLabRequests {
    total: number;
    page: number;
    size: number;
    totalPages: number;
    items: LabRequest[];
}

export const labRequestApi = {
    // Shared: Get single request by ID
    getRequestById: async (id: number) => {
        const response = await privateApi.get<LabRequest>(`/lab-requests/${id}`);
        return response.data;
    },

    // Doctor: Create a request
    createRequest: async (data: {
        patient_id: number;
        request_type: string;
        appointment_id?: number;
        notes?: string;
        priority?: string;
    }) => {
        const response = await privateApi.post("/lab-requests/", data);
        return response.data;
    },

    // Doctor: List my requests
    listMyRequests: async (params: {
        status?: string;
        page?: number;
        size?: number;
    }) => {
        const response = await privateApi.get<PaginatedLabRequests>("/lab-requests/me", {
            params,
        });
        return response.data;
    },

    // Patient: List my requests
    listMyPatientRequests: async (params: {
        status?: string;
        page?: number;
        size?: number;
    }) => {
        const response = await privateApi.get<PaginatedLabRequests>("/lab-requests/patient/me", {
            params,
        });
        return response.data;
    },

    // Lab Tech: List all hospital requests (filtered by hospital on backend)
    listAllRequests: async (params: {
        status?: string;
        page?: number;
        size?: number;
    }) => {
        const response = await privateApi.get<PaginatedLabRequests>("/lab-requests/", {
            params,
        });
        return response.data;
    },

    // Lab Tech: Accept a request
    acceptRequest: async (requestId: number) => {
        const response = await privateApi.post(`/lab-requests/${requestId}/accept`, {});
        return response.data;
    },

    // Lab Tech: Reject a request
    rejectRequest: async (requestId: number) => {
        const response = await privateApi.post(`/lab-requests/${requestId}/reject`, {});
        return response.data;
    },

    // Lab Tech: Upload and Process AI
    processRequest: async (requestId: number, file: File) => {
        const formData = new FormData();
        formData.append("image_file", file);

        const response = await privateApi.post<LabRequest>(
            `/lab-requests/${requestId}/process`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data;
    },

    // Doctor: Review and Approve/Reject
    reviewRequest: async (requestId: number, data: {
        comment: string;
        rating: number;
        approved: boolean;
    }) => {
        const response = await privateApi.post(`/lab-requests/${requestId}/review`, data);
        return response.data;
    },
};
