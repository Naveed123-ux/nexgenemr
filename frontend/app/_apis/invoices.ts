import { privateApi } from "@/lib/axios";

export interface InvoiceItem {
  description: string;
  icd_code: string;
  icd_description: string;
  service_date: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  patient_name: string;
  patient_email: string;
  hospital_name: string;
  hospital_address: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: "pending" | "paid" | "partially_paid" | "overdue";
  payment_method: string | null;
  notes: string | null;
  items?: InvoiceItem[];
}

export interface GenerateInvoiceRequest {
  patient_user_id: number;
  notes?: string;
}

// Patient Endpoints
export async function getMyInvoices(skip: number = 0, limit: number = 10): Promise<Invoice[]> {
  try {
    const response = await privateApi.get<Invoice[]>(`/invoices/patient/my-invoices?skip=${skip}&limit=${limit}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch invoices");
  }
}

export async function getMyInvoiceDetails(invoiceId: number): Promise<Invoice> {
  try {
    const response = await privateApi.get<Invoice>(`/invoices/patient/invoices/${invoiceId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch invoice details");
  }
}

export async function downloadMyInvoice(invoiceId: number): Promise<Blob> {
  try {
    const response = await privateApi.get(`/invoices/patient/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to download invoice");
  }
}

// Hospital Admin Endpoints
export async function generateInvoice(data: GenerateInvoiceRequest): Promise<Invoice> {
  try {
    const response = await privateApi.post<Invoice>("/bills/generate", data);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to generate invoice");
  }
}

export async function getHospitalInvoices(skip: number = 0, limit: number = 20): Promise<Invoice[]> {
  try {
    const response = await privateApi.get<Invoice[]>(`/invoices/hospital/invoices?skip=${skip}&limit=${limit}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch hospital invoices");
  }
}

export async function getHospitalInvoiceDetails(invoiceId: number): Promise<Invoice> {
  try {
    const response = await privateApi.get<Invoice>(`/invoices/hospital/invoices/${invoiceId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch invoice details");
  }
}

export async function downloadHospitalInvoice(invoiceId: number): Promise<Blob> {
  try {
    const response = await privateApi.get(`/invoices/hospital/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to download invoice");
  }
}

export async function getInvoiceByAppointment(appointmentId: number): Promise<Invoice> {
  try {
    const response = await privateApi.get<Invoice>(`/invoices/appointment/${appointmentId}/invoice`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch invoice for appointment");
  }
}

// Universal Endpoints
export async function getInvoiceDetails(invoiceId: number): Promise<Invoice> {
  try {
    const response = await privateApi.get<Invoice>(`/invoices/${invoiceId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to fetch invoice details");
  }
}

export async function downloadInvoice(invoiceId: number): Promise<Blob> {
  try {
    const response = await privateApi.get(`/invoices/${invoiceId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.detail || "Failed to download invoice");
  }
}

// Helper function to trigger download
export function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
