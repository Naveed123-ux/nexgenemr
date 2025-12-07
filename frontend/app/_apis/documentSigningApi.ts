import { privateApi } from "@/lib/axios";

export interface SignedDocument {
  id: number;
  patient_user_id: number;
  signed_by_doctor_id: number | null;
  doctor_signed_at: string | null;
  signed_by_staff_id: number | null;
  staff_signed_at: string | null;
  signed_by_admin_id: number | null;
  admin_signed_at: string | null;
  pdf_file_path: string;
}

export type DocumentType = 'discharge-summary' | 'handoff-note' | 'patient-summary';

export const documentSigningApi = {
  /**
   * Sign a document
   */
  signDocument: async (documentType: DocumentType, documentId: number): Promise<SignedDocument> => {
    const endpoints = {
      'discharge-summary': 'discharge-summaries',
      'handoff-note': 'handoff-notes',
      'patient-summary': 'patient-summaries'
    };

    const endpoint = endpoints[documentType];
    const response = await privateApi.post<SignedDocument>(
      `/${endpoint}/${documentId}/sign`
    );
    return response.data;
  },

  /**
   * Remove signature from document
   */
  removeSignature: async (documentType: DocumentType, documentId: number): Promise<SignedDocument> => {
    const endpoints = {
      'discharge-summary': 'discharge-summaries',
      'handoff-note': 'handoff-notes',
      'patient-summary': 'patient-summaries'
    };

    const endpoint = endpoints[documentType];
    const response = await privateApi.delete<SignedDocument>(
      `/${endpoint}/${documentId}/sign`
    );
    return response.data;
  },
};
