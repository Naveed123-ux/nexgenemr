import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  getMyDischargeSummaries,
  getRecentDischargeSummaries,
  getHospitalDischargeSummaries,
  getDischargeSummary,
  downloadDischargeSummaryPDF,
  downloadDischargeSummaryWord,
  createDischargeSummary,
  updateDischargeSummary,
  DischargeSummary,
  CreateDischargeSummaryRequest,
  UpdateDischargeSummaryRequest,
} from "@/app/_apis/dischargeSummaries";

// State interface
interface DischargeSummaryState {
  // Patient summaries
  patientSummaries: DischargeSummary[];
  patientSummariesLoading: boolean;
  patientSummariesError: string | null;

  // Hospital/Admin summaries
  hospitalSummaries: DischargeSummary[];
  hospitalSummariesLoading: boolean;
  hospitalSummariesError: string | null;

  // Selected summary
  selectedSummary: DischargeSummary | null;
  selectedSummaryLoading: boolean;
  selectedSummaryError: string | null;

  // Create/Update
  creating: boolean;
  createError: string | null;
  updating: boolean;
  updateError: string | null;

  // Download states
  downloading: { id: number; type: "pdf" | "word" } | null;
  downloadError: string | null;
}

const initialState: DischargeSummaryState = {
  patientSummaries: [],
  patientSummariesLoading: false,
  patientSummariesError: null,

  hospitalSummaries: [],
  hospitalSummariesLoading: false,
  hospitalSummariesError: null,

  selectedSummary: null,
  selectedSummaryLoading: false,
  selectedSummaryError: null,

  creating: false,
  createError: null,
  updating: false,
  updateError: null,

  downloading: null,
  downloadError: null,
};

// Async Thunks

// Fetch patient's own summaries
export const fetchPatientSummaries = createAsyncThunk(
  "dischargeSummary/fetchPatientSummaries",
  async (_, { rejectWithValue }) => {
    try {
      const summaries = await getMyDischargeSummaries();
      return summaries;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch patient summaries");
    }
  }
);

// Fetch hospital/admin summaries
export const fetchHospitalSummaries = createAsyncThunk(
  "dischargeSummary/fetchHospitalSummaries",
  async ({ limit = 100, offset = 0 }: { limit?: number; offset?: number } = {}, { rejectWithValue }) => {
    try {
      const summaries = await getHospitalDischargeSummaries(limit, offset);
      return summaries;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch hospital summaries");
    }
  }
);

// Fetch single summary
export const fetchDischargeSummary = createAsyncThunk(
  "dischargeSummary/fetchSummary",
  async (summaryId: number, { rejectWithValue }) => {
    try {
      const summary = await getDischargeSummary(summaryId);
      return summary;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch summary");
    }
  }
);

// Create discharge summary
export const createDischargeSummaryThunk = createAsyncThunk(
  "dischargeSummary/create",
  async (data: CreateDischargeSummaryRequest, { rejectWithValue }) => {
    try {
      const summary = await createDischargeSummary(data);
      return summary;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create discharge summary");
    }
  }
);

// Update discharge summary
export const updateDischargeSummaryThunk = createAsyncThunk(
  "dischargeSummary/update",
  async (
    { summaryId, data }: { summaryId: number; data: UpdateDischargeSummaryRequest },
    { rejectWithValue }
  ) => {
    try {
      const summary = await updateDischargeSummary(summaryId, data);
      return summary;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update discharge summary");
    }
  }
);

// Download PDF
export const downloadPDFThunk = createAsyncThunk(
  "dischargeSummary/downloadPDF",
  async (summaryId: number, { rejectWithValue }) => {
    try {
      const blob = await downloadDischargeSummaryPDF(summaryId);
      return { blob, summaryId };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to download PDF");
    }
  }
);

// Download Word
export const downloadWordThunk = createAsyncThunk(
  "dischargeSummary/downloadWord",
  async (summaryId: number, { rejectWithValue }) => {
    try {
      const blob = await downloadDischargeSummaryWord(summaryId);
      return { blob, summaryId };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to download Word document");
    }
  }
);

// Slice
const dischargeSummarySlice = createSlice({
  name: "dischargeSummary",
  initialState,
  reducers: {
    clearSelectedSummary: (state) => {
      state.selectedSummary = null;
      state.selectedSummaryError = null;
    },
    clearErrors: (state) => {
      state.patientSummariesError = null;
      state.hospitalSummariesError = null;
      state.selectedSummaryError = null;
      state.createError = null;
      state.updateError = null;
      state.downloadError = null;
    },
    setDownloading: (state, action: PayloadAction<{ id: number; type: "pdf" | "word" } | null>) => {
      state.downloading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Patient Summaries
      .addCase(fetchPatientSummaries.pending, (state) => {
        state.patientSummariesLoading = true;
        state.patientSummariesError = null;
      })
      .addCase(fetchPatientSummaries.fulfilled, (state, action: PayloadAction<DischargeSummary[]>) => {
        state.patientSummariesLoading = false;
        state.patientSummaries = action.payload;
      })
      .addCase(fetchPatientSummaries.rejected, (state, action) => {
        state.patientSummariesLoading = false;
        state.patientSummariesError = action.payload as string;
      })

      // Fetch Hospital Summaries
      .addCase(fetchHospitalSummaries.pending, (state) => {
        state.hospitalSummariesLoading = true;
        state.hospitalSummariesError = null;
      })
      .addCase(fetchHospitalSummaries.fulfilled, (state, action: PayloadAction<DischargeSummary[]>) => {
        state.hospitalSummariesLoading = false;
        state.hospitalSummaries = action.payload;
      })
      .addCase(fetchHospitalSummaries.rejected, (state, action) => {
        state.hospitalSummariesLoading = false;
        state.hospitalSummariesError = action.payload as string;
      })

      // Fetch Single Summary
      .addCase(fetchDischargeSummary.pending, (state) => {
        state.selectedSummaryLoading = true;
        state.selectedSummaryError = null;
      })
      .addCase(fetchDischargeSummary.fulfilled, (state, action: PayloadAction<DischargeSummary>) => {
        state.selectedSummaryLoading = false;
        state.selectedSummary = action.payload;
      })
      .addCase(fetchDischargeSummary.rejected, (state, action) => {
        state.selectedSummaryLoading = false;
        state.selectedSummaryError = action.payload as string;
      })

      // Create Summary
      .addCase(createDischargeSummaryThunk.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createDischargeSummaryThunk.fulfilled, (state, action: PayloadAction<DischargeSummary>) => {
        state.creating = false;
        // Add to hospital summaries
        state.hospitalSummaries.unshift(action.payload);
      })
      .addCase(createDischargeSummaryThunk.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload as string;
      })

      // Update Summary
      .addCase(updateDischargeSummaryThunk.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateDischargeSummaryThunk.fulfilled, (state, action: PayloadAction<DischargeSummary>) => {
        state.updating = false;
        // Update in hospital summaries
        const index = state.hospitalSummaries.findIndex((s) => s.id === action.payload.id);
        if (index !== -1) {
          state.hospitalSummaries[index] = action.payload;
        }
        // Update selected summary if it's the same
        if (state.selectedSummary?.id === action.payload.id) {
          state.selectedSummary = action.payload;
        }
      })
      .addCase(updateDischargeSummaryThunk.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload as string;
      })

      // Download PDF
      .addCase(downloadPDFThunk.pending, (state, action) => {
        state.downloading = { id: action.meta.arg, type: "pdf" };
        state.downloadError = null;
      })
      .addCase(downloadPDFThunk.fulfilled, (state) => {
        state.downloading = null;
      })
      .addCase(downloadPDFThunk.rejected, (state, action) => {
        state.downloading = null;
        state.downloadError = action.payload as string;
      })

      // Download Word
      .addCase(downloadWordThunk.pending, (state, action) => {
        state.downloading = { id: action.meta.arg, type: "word" };
        state.downloadError = null;
      })
      .addCase(downloadWordThunk.fulfilled, (state) => {
        state.downloading = null;
      })
      .addCase(downloadWordThunk.rejected, (state, action) => {
        state.downloading = null;
        state.downloadError = action.payload as string;
      });
  },
});

export const { clearSelectedSummary, clearErrors, setDownloading } = dischargeSummarySlice.actions;
export default dischargeSummarySlice.reducer;
