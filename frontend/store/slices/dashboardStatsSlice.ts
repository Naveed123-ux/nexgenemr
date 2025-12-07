// src/store/slices/dashboardStatsSlice.ts

import { privateApi } from "@/lib/axios";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Defines the shape of the data returned from the API
interface DashboardStats {
  total_doctors: number;
  total_patients: number;
  appointments_today: number;
}

// Defines the shape of our slice's state
interface DashboardStatsState {
  data: DashboardStats | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

// Sets the initial state for the slice
const initialState: DashboardStatsState = {
  data: null,
  status: "idle", // 'idle' means we haven't fetched anything yet
  error: null,
};

/**
 * Fetches the dashboard statistics from the API endpoint.
 * This is an async action that will dispatch pending/fulfilled/rejected actions.
 */
export const fetchDashboardStats = createAsyncThunk(
  "dashboardStats/fetchStats",
  async (_, { rejectWithValue }) => {
    try {
      // Makes the GET request to the specified endpoint
      const response = await privateApi.get<DashboardStats>(
        "/staff/dashboard-stats"
      );
      return response.data;
    } catch (error: any) {
      // Extracts a user-friendly error message or provides a default one
      const errorMessage =
        error.response?.data?.detail || "An unknown error occurred";
      return rejectWithValue(errorMessage);
    }
  }
);

const dashboardStatsSlice = createSlice({
  name: "dashboardStats",
  initialState,
  // No synchronous reducers needed for this slice
  reducers: {},
  // Handles the actions dispatched by the createAsyncThunk
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchDashboardStats.fulfilled,
        (state, action: PayloadAction<DashboardStats>) => {
          state.status = "succeeded";
          state.data = action.payload;
        }
      )
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default dashboardStatsSlice.reducer;