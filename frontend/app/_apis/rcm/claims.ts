import { privateApi } from "@/lib/axios";
import { Claim, GenerateClaimResponse, EligibilityResponse, SubmissionResponse } from "@/hooks/types/types";
import { isAxiosError } from "axios";

// Generate claims for a specific patient
export const generateClaims = async (patientId: number): Promise<GenerateClaimResponse> => {
  try {
    const response = await privateApi.post<GenerateClaimResponse>(`/claims/generate/${patientId}`, {});
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to generate claims");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to generate claims");
  }
};

// Fetch all claims with pagination
export const fetchClaims = async (skip: number = 0, limit: number = 100): Promise<Claim[]> => {
  try {
    const response = await privateApi.get<Claim[]>(`/claims/?skip=${skip}&limit=${limit}`);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to fetch claims");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to fetch claims");
  }
};

// Check claim eligibility
export const checkClaimEligibility = async (claimId: number): Promise<EligibilityResponse> => {
  try {
    const response = await privateApi.get<EligibilityResponse>(`/claims/${claimId}/eligibility`);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to check eligibility");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to check eligibility");
  }
};

// Submit claim to insurance payer
export const submitClaim = async (claimId: number): Promise<SubmissionResponse> => {
  try {
    const response = await privateApi.post<SubmissionResponse>(`/claims/${claimId}/submit`, {});
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (error.response) {
        throw new Error(error.response.data.detail || "Failed to submit claim");
      } else if (error.request) {
        throw new Error("No response from server");
      } else {
        throw new Error("Error in request setup: " + error.message);
      }
    }
    throw new Error("Failed to submit claim");
  }
};
