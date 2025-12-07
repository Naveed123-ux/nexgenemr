// store/slices/patientPrescriptionsSlice.ts

import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";
import { Prescription } from "@/hooks/types/types";

// --- State and Types ---
interface PatientPrescriptionsState {
  prescriptions: Prescription[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: PatientPrescriptionsState = {
  prescriptions: [],
  status: "idle",
  error: null,
};

// --- Async Thunk ---
export const fetchPrescriptionsForPatient = createAsyncThunk(
  "patientPrescriptions/fetchForPatient",
  async (patientProfileId: number, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<Prescription[]>(
        `/prescriptions/patient/${patientProfileId}`
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to fetch prescriptions."
      );
    }
  }
);

// --- Slice Definition ---
const patientPrescriptionsSlice = createSlice({
  name: "patientPrescriptions",
  initialState,
  reducers: {
    resetPatientPrescriptions: (state) => {
      state.prescriptions = [];
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPrescriptionsForPatient.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchPrescriptionsForPatient.fulfilled,
        (state, action: PayloadAction<Prescription[]>) => {
          state.status = "succeeded";
          state.prescriptions = action.payload;
        }
      )
      .addCase(fetchPrescriptionsForPatient.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { resetPatientPrescriptions } = patientPrescriptionsSlice.actions;
export default patientPrescriptionsSlice.reducer;