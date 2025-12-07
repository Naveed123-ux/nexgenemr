// src/store/slices/patientSnapshotSlice.ts

import { privateApi } from "@/lib/axios";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// --- TYPE DEFINITIONS BASED ON API RESPONSE ---

interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface JourneyItem {
  appointment_id: number;
  date: string;
  doctor_name: string;
  reason_for_visit: string;
  vitals: null | Record<string, any>; // Define more specifically if vitals structure is known
  soap_note: SoapNote | null;
}

interface MedicalHistory {
  allergies: string[];
  current_medications: string[];
  past_medical_history: string[];
}

interface Header {
  profile_id: number;
  full_name: string;
  email: string;
  care_team: string[];
  medical_history: MedicalHistory;
}

interface PatientSnapshot {
  header: Header;
  journey: JourneyItem[];
}

// --- SLICE STATE DEFINITION ---

interface PatientSnapshotState {
  data: PatientSnapshot | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: PatientSnapshotState = {
  data: null,
  status: "idle",
  error: null,
};

// --- ASYNC THUNK FOR FETCHING DATA ---

/**
 * Fetches the snapshot for a single patient from the API.
 * @param {number} patientId - The ID of the patient to fetch.
 */
export const fetchPatientSnapshot = createAsyncThunk(
  "patientSnapshot/fetchById",
  async (patientId: number, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<PatientSnapshot>(
        `/snapshot/patient/${patientId}`
      );
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Failed to fetch patient snapshot";
      return rejectWithValue(errorMessage);
    }
  }
);

// --- SLICE CREATION ---

const patientSnapshotSlice = createSlice({
  name: "patientSnapshot",
  initialState,
  reducers: {
    // Standard reducers can be added here if needed
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatientSnapshot.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchPatientSnapshot.fulfilled,
        (state, action: PayloadAction<PatientSnapshot>) => {
          state.status = "succeeded";
          state.data = action.payload;
        }
      )
      .addCase(fetchPatientSnapshot.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default patientSnapshotSlice.reducer;