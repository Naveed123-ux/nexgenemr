// src/store/slices/availabilitySlice.ts
// ❌ DEPRECATED: This slice uses the old availability template system
// ✅ Use sessionsSlice.ts instead for the new unified session system

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios"; // Your configured axios instance

// ---- Types ----
export interface AvailabilitySlot {
  day_of_week: string;
  start_time: string; // e.g., "08:30:00"
  end_time: string;   // e.g., "10:30:00"
  slot_duration_minutes: number;
  is_telemedicine: boolean;
}

interface AvailabilityTemplate {
  slots: AvailabilitySlot[];
}

// ---- State ----
interface AvailabilityState {
  template: AvailabilityTemplate;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AvailabilityState = {
  template: { slots: [] },
  status: "idle",
  error: null,
};

// ---- Async Thunks ----

/**
 * Fetches the doctor's availability template.
 */
export const fetchAvailabilityTemplate = createAsyncThunk(
  "availability/fetchTemplate",
  async (_, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<AvailabilityTemplate>("/availability/template");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || "Failed to fetch availability.");
    }
  }
);

/**
 * Saves (creates or updates) the doctor's availability template.
 */
export const saveAvailabilityTemplate = createAsyncThunk(
  "availability/saveTemplate",
  async (template: AvailabilityTemplate, { rejectWithValue }) => {
    try {
      const response = await privateApi.post<AvailabilityTemplate>("/availability/template", template);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || "Failed to save availability.");
    }
  }
);

// ---- Slice Definition ----
const availabilitySlice = createSlice({
  name: "availability",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Template
      .addCase(fetchAvailabilityTemplate.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAvailabilityTemplate.fulfilled, (state, action: PayloadAction<AvailabilityTemplate>) => {
        state.status = "succeeded";
        state.template = action.payload;
      })
      .addCase(fetchAvailabilityTemplate.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      // Save Template
      .addCase(saveAvailabilityTemplate.pending, (state) => {
        state.status = "loading";
      })
      .addCase(saveAvailabilityTemplate.fulfilled, (state, action: PayloadAction<AvailabilityTemplate>) => {
        state.status = "succeeded";
        state.template = action.payload; // Update state with the saved template
      })
      .addCase(saveAvailabilityTemplate.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default availabilitySlice.reducer;