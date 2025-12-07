// FILE: store/slices/patientDashboardSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { PatientDashboardData } from "@/hooks/types/types";
import { getPatientDashboard } from "@/app/_apis/patient/api";

interface PatientDashboardState {
  data: PatientDashboardData | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: PatientDashboardState = {
  data: null,
  status: "idle",
  error: null,
};

export const fetchPatientDashboard = createAsyncThunk(
  "patientDashboard/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getPatientDashboard();
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const patientDashboardSlice = createSlice({
  name: "patientDashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPatientDashboard.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchPatientDashboard.fulfilled,
        (state, action: PayloadAction<PatientDashboardData>) => {
          state.status = "succeeded";
          state.data = action.payload;
        }
      )
      .addCase(fetchPatientDashboard.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default patientDashboardSlice.reducer;