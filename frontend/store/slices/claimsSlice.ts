import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";
import { Claim, GenerateClaimResponse } from "@/hooks/types/types";

interface ClaimsState {
  claims: Claim[];
  loading: boolean;
  error: string | null;
  generateLoading: boolean;
  generateError: string | null;
  lastGenerateMessage: string | null;
}

const initialState: ClaimsState = {
  claims: [],
  loading: false,
  error: null,
  generateLoading: false,
  generateError: null,
  lastGenerateMessage: null,
};

// Async thunk to fetch all claims
export const fetchClaims = createAsyncThunk(
  "claims/fetchAll",
  async ({ skip = 0, limit = 100 }: { skip?: number; limit?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<Claim[]>(`/claims/?skip=${skip}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to fetch claims"
      );
    }
  }
);

// Async thunk to generate claims for a patient
export const generateClaims = createAsyncThunk(
  "claims/generate",
  async (patientId: number, { rejectWithValue }) => {
    try {
      const response = await privateApi.post<GenerateClaimResponse>(`/claims/generate/${patientId}`, {});
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to generate claims"
      );
    }
  }
);

const claimsSlice = createSlice({
  name: "claims",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.generateError = null;
    },
    clearGenerateMessage: (state) => {
      state.lastGenerateMessage = null;
    },
    resetClaims: (state) => {
      state.claims = [];
      state.loading = false;
      state.error = null;
      state.generateLoading = false;
      state.generateError = null;
      state.lastGenerateMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch claims
      .addCase(fetchClaims.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClaims.fulfilled, (state, action: PayloadAction<Claim[]>) => {
        state.loading = false;
        state.claims = action.payload;
        state.error = null;
      })
      .addCase(fetchClaims.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Generate claims
      .addCase(generateClaims.pending, (state) => {
        state.generateLoading = true;
        state.generateError = null;
        state.lastGenerateMessage = null;
      })
      .addCase(generateClaims.fulfilled, (state, action: PayloadAction<GenerateClaimResponse>) => {
        state.generateLoading = false;
        state.lastGenerateMessage = action.payload.message;
        state.generateError = null;
      })
      .addCase(generateClaims.rejected, (state, action) => {
        state.generateLoading = false;
        state.generateError = action.payload as string;
      });
  },
});

export const { clearError, clearGenerateMessage, resetClaims } = claimsSlice.actions;
export default claimsSlice.reducer;
