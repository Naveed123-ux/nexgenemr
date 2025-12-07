import { privateApi } from "@/lib/axios";
import { Bill } from "@/hooks/types/types";
import { isAxiosError } from "axios";

// Patient billing summary interface
export interface BillingSummary {
  total_bills: number;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  bills_by_status: {
    pending: number;
    paid: number;
    partially_paid?: number;
  };
  overdue_count: number;
  next_due_date: string | null;
  recent_bills: Array<{
    id: number;
    bill_number: string;
    amount: number;
    outstanding: number;
    status: string;
    due_date: string;
  }>;
}

// Payment intent response
export interface PaymentIntentResponse {
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
}

// Payment response
export interface PaymentResponse {
  success: boolean;
  message: string;
  bill_id: number;
  amount_paid: number;
  outstanding_amount: number;
  status: string;
  stripe_payment_intent_id: string;
  stripe_charge_id: string;
}

// Get patient's bills
export const getMyBills = async (skip: number = 0, limit: number = 100): Promise<Bill[]> => {
  try {
    const response = await privateApi.get<Bill[]>(`/bills/patient/my-bills?skip=${skip}&limit=${limit}`);
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

// Get billing summary
export const getBillingSummary = async (): Promise<BillingSummary> => {
  try {
    const response = await privateApi.get<BillingSummary>("/bills/patient/summary");
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to fetch billing summary");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to fetch billing summary");
  }
};

// Get bill details
export const getMyBillDetails = async (billId: number): Promise<Bill> => {
  try {
    const response = await privateApi.get<Bill>(`/bills/patient/bills/${billId}`);
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

// Create payment intent
export const createPaymentIntent = async (billId: number, amount?: number): Promise<PaymentIntentResponse> => {
  try {
    const response = await privateApi.post<PaymentIntentResponse>("/bills/payment-intent", {
      bill_id: billId,
      amount: amount,
    });
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to create payment intent");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to create payment intent");
  }
};

// Confirm payment intent with payment method
export const confirmPaymentIntent = async (
  paymentIntentId: string,
  paymentMethodId: string
): Promise<any> => {
  try {
    // This would normally be done with Stripe.js on the frontend
    // For testing, we'll call a backend endpoint to confirm it
    const response = await privateApi.post(`/bills/confirm-payment-intent`, {
      payment_intent_id: paymentIntentId,
      payment_method_id: paymentMethodId,
    });
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to confirm payment");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to confirm payment");
  }
};

// Process payment
export const processPayment = async (
  billId: number,
  paymentMethodId: string,
  amount?: number
): Promise<PaymentResponse> => {
  try {
    const response = await privateApi.post<PaymentResponse>(`/bills/${billId}/pay`, {
      payment_method_id: paymentMethodId,
      amount: amount,
    });
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to process payment");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to process payment");
  }
};
