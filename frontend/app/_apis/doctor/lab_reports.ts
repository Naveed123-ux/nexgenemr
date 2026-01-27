import { privateApi } from "@/lib/axios";

export interface LabRequestCreate {
    patient_id: number;
    request_type: string;
    appointment_id?: number;
    notes?: string;
    priority?: string;
}

export interface LabRequest {
    id: number;
    patient_id: number;
    doctor_id: number;
    lab_tech_id: number | null;
    appointment_id: number | null;
    request_type: string;
    status: string;
    priority: string;
    notes: string | null;
    doctor_comment: string | null;
    doctor_rating: number | null;
    created_at: string;
    updated_at: string;
    patient_name?: string;
    appointment_time?: string;
    brain_tumor_result?: {
        id: number;
        image_url: string;
        result_class: string;
        confidence: number;
        created_at: string;
    };
}

export interface PaginatedLabRequests {
    total: number;
    page: number;
    size: number;
    totalPages: number;
    items: LabRequest[];
}

export const createLabRequest = async (data: LabRequestCreate) => {
    const response = await privateApi.post("/lab-requests/", data);
    return response.data;
};

export const getMyLabRequests = async (params: {
    status?: string;
    page?: number;
    size?: number;
}) => {
    const response = await privateApi.get<PaginatedLabRequests>("/lab-requests/me", {
        params,
    });
    return response.data;
};

export const reviewLabRequest = async (requestId: number, data: {
    comment: string;
    rating: number;
    approved: boolean;
}) => {
    const response = await privateApi.post(`/lab-requests/${requestId}/review`, data);
    return response.data;
};

