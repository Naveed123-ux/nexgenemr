import { privateApi } from "@/lib/axios";

export interface SignatureResponse {
  id: number;
  user_id: number;
  signature_file_path: string;
  uploaded_at: string;
}

export interface SignatureUploadResponse {
  message: string;
  signature: SignatureResponse;
}

export interface HasSignatureResponse {
  has_signature: boolean;
  signature_url: string | null;
}

export const signatureApi = {
  /**
   * Upload or update e-signature
   * Accepts PNG or JPEG files (max 2MB)
   */
  uploadSignature: async (file: File): Promise<SignatureUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await privateApi.post<SignatureUploadResponse>(
      "/signatures/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  },

  /**
   * Get current user's signature
   */
  getMySignature: async (): Promise<SignatureResponse> => {
    const response = await privateApi.get<SignatureResponse>(
      "/signatures/my-signature"
    );
    return response.data;
  },

  /**
   * Get a specific user's signature
   */
  getUserSignature: async (userId: number): Promise<SignatureResponse> => {
    const response = await privateApi.get<SignatureResponse>(
      `/signatures/user/${userId}`
    );
    return response.data;
  },

  /**
   * Delete current user's signature
   */
  deleteSignature: async (): Promise<{ message: string }> => {
    const response = await privateApi.delete<{ message: string }>(
      "/signatures/delete"
    );
    return response.data;
  },

  /**
   * Check if current user has uploaded a signature
   */
  hasSignature: async (): Promise<HasSignatureResponse> => {
    const response = await privateApi.get<HasSignatureResponse>(
      "/signatures/has-signature"
    );
    return response.data;
  },

  /**
   * Get full signature URL
   */
  getSignatureUrl: (signaturePath: string): string => {
    // Remove leading slash if present
    const path = signaturePath.startsWith("/") ? signaturePath.slice(1) : signaturePath;
    return `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/${path}`;
  },
};
