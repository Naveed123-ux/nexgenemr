// src/store/slices/patientsSlice.ts

import { SingAppPatient } from "@/hooks/types/types";
import { privateApi } from "@/lib/axios";
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

type DynamicData = Record<string, any>;

// Defines the shape of our state
interface PatientsState {
  data: DynamicData[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  singlePatient: SingAppPatient | null;
}

const initialState: PatientsState = {
  data: [],
  status: "idle", // 'idle' means we haven't fetched anything yet
  error: null,
  singlePatient: null,
};

/**`
 * Fetches the list of all patients from the API endpoint.
 * This is an async action that will dispatch pending/fulfilled/rejected actions.
 */
export const fetchAllPatients = createAsyncThunk(
  "patients/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<DynamicData[]>(
        "/patient-list/doctor"
      );
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "An unknown error occurred";
      return rejectWithValue(errorMessage);
    }
  }
);

const patientsSlice = createSlice({
  name: "patients",
  initialState,
  reducers: {
    selectPaitentForSoap: (state, action: PayloadAction<SingAppPatient>) => {
      state.singlePatient = action.payload;
    },
  },
  // Handles the actions dispatched by the createAsyncThunk
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllPatients.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchAllPatients.fulfilled,
        (state, action: PayloadAction<DynamicData[]>) => {
          state.status = "succeeded";
          state.data = action.payload;
        }
      )
      .addCase(fetchAllPatients.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});
export const { selectPaitentForSoap } = patientsSlice.actions;
export default patientsSlice.reducer;
