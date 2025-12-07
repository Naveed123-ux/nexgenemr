import { privateApi } from "@/lib/axios";
import { Bill, GenerateBillRequest, UpdateBillRequest } from "@/hooks/types/types";
import { isAxiosError } from "axios";

// Generate bill for a self-pay patient
export const generateBill = async (data: GenerateBillRequest): Promise<Bill> => {
  try {
    const response = await privateApi.post<Bill>("/bills/generate", data);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to generate bill");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to generate bill");
  }
};

// Get all bills
export const fetchBills = async (skip: number = 0, limit: number = 100): Promise<Bill[]> => {
  try {
    const response = await privateApi.get<Bill[]>(`/bills/?skip=${skip}&limit=${limit}`);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to fetch bills");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to fetch bills");
  }
};

// Get bill details
export const fetchBillDetails = async (billId: number): Promise<Bill> => {
  try {
    const response = await privateApi.get<Bill>(`/bills/${billId}`);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to fetch bill details");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to fetch bill details");
  }
};

// Update bill
export const updateBill = async (billId: number, data: UpdateBillRequest): Promise<Bill> => {
  try {
    const response = await privateApi.put<Bill>(`/bills/${billId}`, data);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to update bill");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to update bill");
  }
};

// Delete bill
export const deleteBill = async (billId: number): Promise<void> => {
  try {
    await privateApi.delete(`/bills/${billId}`);
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to delete bill");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to delete bill");
  }
};
