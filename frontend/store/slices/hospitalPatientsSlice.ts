import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";
import { HospitalPatient } from "@/hooks/types/types";

interface HospitalPatientsState {
  patients: HospitalPatient[];
  loading: boolean;
  error: string | null;
}

const initialState: HospitalPatientsState = {
  patients: [],
  loading: false,
  error: null,
};

// Async thunk to fetch all hospital patients
export const fetchHospitalPatients = createAsyncThunk(
  "hospitalPatients/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<HospitalPatient[]>("/patients/hospital/all");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to fetch hospital patients"
      );
    }
  }
);

const hospitalPatientsSlice = createSlice({
  name: "hospitalPatients",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetPatients: (state) => {
      state.patients = [];
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHospitalPatients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHospitalPatients.fulfilled, (state, action: PayloadAction<HospitalPatient[]>) => {
        state.loading = false;
        state.patients = action.payload;
        state.error = null;
      })
      .addCase(fetchHospitalPatients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, resetPatients } = hospitalPatientsSlice.actions;
export default hospitalPatientsSlice.reducer;
