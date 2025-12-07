
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";
import { PatientListItem } from "@/hooks/types/types";

type DynamicData = Record<string, any>;

interface AllPatientsState {
  data: DynamicData[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: AllPatientsState = {
  data: [],
  status: "idle",
  error: null,
};

export const fetchAllPatientsList = createAsyncThunk(
  "allPatients/fetchAllList",
  async (_, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<PatientListItem[]>("/patient-list/list");
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.detail || "Failed to fetch patient list.";
      return rejectWithValue(errorMessage);
    }
  }
);

const allPatientsSlice = createSlice({
  name: "allPatients",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllPatientsList.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchAllPatientsList.fulfilled,
        (state, action: PayloadAction<DynamicData[]>) => {
          state.status = "succeeded";
          state.data = action.payload;
        }
      )
      .addCase(fetchAllPatientsList.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export default allPatientsSlice.reducer;