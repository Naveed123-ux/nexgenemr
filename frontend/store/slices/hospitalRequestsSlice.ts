// src/store/slices/hospitalRequestsSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios"; // Assuming you have a configured axios instance

// ---- Types ----
export interface HospitalRequest {
  id: number;
  name: string;
  code: string;
  email: string;
  phone_number: string;
  country: string;
  status: "accepted" | "rejected" | "pending";
}

interface UpdateStatusArgs {
  requestId: number;
  status: "accepted" | "rejected";
}

// ---- State ----
interface HospitalRequestsState {
  requests: HospitalRequest[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: HospitalRequestsState = {
  requests: [],
  status: "idle",
  error: null,
};

// ---- Async Thunks ----

/**
 * Fetches all hospital requests.
 */
export const fetchHospitalRequests = createAsyncThunk(
  "hospitalRequests/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<HospitalRequest[]>("/hospital-requests/");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || "Failed to fetch requests.");
    }
  }
);

/**
 * Updates the status of a specific hospital request (accept or reject).
 */
export const updateHospitalRequestStatus = createAsyncThunk(
  "hospitalRequests/updateStatus",
  async ({ requestId, status }: UpdateStatusArgs, { rejectWithValue }) => {
    try {
      const response = await privateApi.put(`/hospital-requests/${requestId}`, { status });
      // Return the original requestId and new status for updating the state
      return { ...response.data.request, id: requestId, status };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || "Failed to update status.");
    }
  }
);

/**
 * Deletes a hospital request.
 */
export const deleteHospitalRequest = createAsyncThunk(
  "hospitalRequests/delete",
  async (requestId: number, { rejectWithValue }) => {
    try {
      await privateApi.delete(`/hospital-requests/${requestId}`);
      return requestId; // Return the ID of the deleted request
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || "Failed to delete request.");
    }
  }
);

// ---- Slice Definition ----

const hospitalRequestsSlice = createSlice({
  name: "hospitalRequests",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Requests
      .addCase(fetchHospitalRequests.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchHospitalRequests.fulfilled, (state, action: PayloadAction<HospitalRequest[]>) => {
        state.status = "succeeded";
        state.requests = action.payload;
      })
      .addCase(fetchHospitalRequests.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      // Update Request Status
      .addCase(updateHospitalRequestStatus.fulfilled, (state, action: PayloadAction<HospitalRequest>) => {
        const index = state.requests.findIndex((req) => req.id === action.payload.id);
        if (index !== -1) {
          state.requests[index] = action.payload;
        }
      })
      // Delete Request
      .addCase(deleteHospitalRequest.fulfilled, (state, action: PayloadAction<number>) => {
        state.requests = state.requests.filter((req) => req.id !== action.payload);
      });
  },
});

export default hospitalRequestsSlice.reducer;