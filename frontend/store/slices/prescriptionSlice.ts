import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  createPrescription,
  getPrescriptionsForPatient,
  cancelPrescription,
  deletePrescription,
} from "@/app/_apis/common/prescriptions";
import {
  Prescription,
  CreatePrescriptionPayload,
} from "@/hooks/types/types";

interface PrescriptionState {
  prescriptions: Prescription[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
}

const initialState: PrescriptionState = {
  prescriptions: [],
  status: "idle",
  error: null,
};


export const fetchPrescriptions = createAsyncThunk(
  "prescriptions/fetch",
  async (patientProfileId: number, { rejectWithValue }) => {
    try {
      const data = await getPrescriptionsForPatient(patientProfileId);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const addPrescription = createAsyncThunk(
  "prescriptions/add",
  async (payload: CreatePrescriptionPayload, { rejectWithValue }) => {
    try {
      const data = await createPrescription(payload);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const cancelExistingPrescription = createAsyncThunk(
  "prescriptions/cancel",
  async (prescriptionId: number, { rejectWithValue }) => {
    try {
      await cancelPrescription(prescriptionId);
      return prescriptionId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteExistingPrescription = createAsyncThunk(
  "prescriptions/delete",
  async (prescriptionId: number, { rejectWithValue }) => {
    try {
      await deletePrescription(prescriptionId);
      return prescriptionId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const prescriptionSlice = createSlice({
  name: "prescriptions",
  initialState,
  reducers: {
    // ADDED: Reducer to clear the prescriptions and reset status
    resetPrescriptions: (state) => {
      state.prescriptions = [];
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPrescriptions.pending, (state) => {
        state.status = "loading";
      })
      .addCase(
        fetchPrescriptions.fulfilled,
        (state, action: PayloadAction<Prescription[]>) => {
          state.status = "succeeded";
          state.prescriptions = action.payload;
        }
      )
      .addCase(fetchPrescriptions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })
      .addCase(
        addPrescription.fulfilled,
        (state, action: PayloadAction<Prescription>) => {
          state.prescriptions.unshift(action.payload);
        }
      )
      .addCase(
        cancelExistingPrescription.fulfilled,
        (state, action: PayloadAction<number>) => {
          const index = state.prescriptions.findIndex(
            (p) => p.id === action.payload
          );
          if (index !== -1) {
            state.prescriptions[index].status = "cancelled";
          }
        }
      )
      .addCase(
        deleteExistingPrescription.fulfilled,
        (state, action: PayloadAction<number>) => {
          state.prescriptions = state.prescriptions.filter(
            (p) => p.id !== action.payload
          );
        }
      );
  },
});

// EXPORT THE NEW ACTION
export const { resetPrescriptions } = prescriptionSlice.actions;

export default prescriptionSlice.reducer;

