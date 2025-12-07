import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios"; // Adjust path to your axios instance

// --- Types ---
interface SynopsisState {
  synopsisText: string | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

interface SynopsisResponse {
  synopsis_text: string;
}

// --- Initial State ---
const initialState: SynopsisState = {
  synopsisText: null,
  status: "idle",
  error: null,
};

// --- Async Thunk ---
export const fetchPatientSynopsis = createAsyncThunk(
  "patientSynopsis/fetch",
  async (patientId: number, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<SynopsisResponse>(
        `/synopsis/patient/${patientId}`
      );
      return response.data.synopsis_text;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to generate synopsis."
      );
    }
  }
);

// --- Slice Definition ---
const patientSynopsisSlice = createSlice({
  name: "patientSynopsis",
  initialState,
  reducers: {
    resetSynopsis: (state) => {
      state.synopsisText = null;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatientSynopsis.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchPatientSynopsis.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.synopsisText = action.payload;
      })
      .addCase(fetchPatientSynopsis.rejected, (state, action) => {
        // <-- Corrected
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { resetSynopsis } = patientSynopsisSlice.actions;
export default patientSynopsisSlice.reducer;
