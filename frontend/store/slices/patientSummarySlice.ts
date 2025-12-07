import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  createPatientSummary,
  getPatientSummary,
  getPatientSummaries,
  getMySummaries,
  updatePatientSummary,
  downloadPatientSummaryPDF,
  downloadPatientSummaryWord,
  getRecentPatientSummaries,
  getUnviewedPatientSummaries,
  PatientSummary,
  CreatePatientSummaryRequest,
  UpdatePatientSummaryRequest,
} from "@/app/_apis/patientSummaries";

// State interface
interface PatientSummaryState {
  // Doctor's recent summaries
  recentSummaries: PatientSummary[];
  recentSummariesLoading: boolean;
  recentSummariesError: string | null;

  // Unviewed summaries (Doctor)
  unviewedSummaries: PatientSummary[];
  unviewedSummariesLoading: boolean;
  unviewedSummariesError: string | null;

  // Patient's own summaries
  mySummaries: PatientSummary[];
  mySummariesLoading: boolean;
  mySummariesError: string | null;

  // Specific patient summaries (for doctor viewing)
  patientSummaries: PatientSummary[];
  patientSummariesLoading: boolean;
  patientSummariesError: string | null;

  // Selected summary
  selectedSummary: PatientSummary | null;
  selectedSummaryLoading: boolean;
  selectedSummaryError: string | null;

  // Create/Update
  creating: boolean;
  createError: string | null;
  updating: boolean;
  updateError: string | null;

  // Download
  downloading: { id: number; type: "pdf" | "word" } | null;
  downloadError: string | null;
}

const initialState: PatientSummaryState = {
  recentSummaries: [],
  recentSummariesLoading: false,
  recentSummariesError: null,

  unviewedSummaries: [],
  unviewedSummariesLoading: false,
  unviewedSummariesError: null,

  mySummaries: [],
  mySummariesLoading: false,
  mySummariesError: null,

  patientSummaries: [],
  patientSummariesLoading: false,
  patientSummariesError: null,

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

// Async thunks

// Fetch recent summaries (Doctor)
export const fetchRecentPatientSummaries = createAsyncThunk(
  "patientSummary/fetchRecent",
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const summaries = await getRecentPatientSummaries(limit);
      return summaries;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch recent summaries");
    }
  }
);

// Fetch unviewed summaries (Doctor)
export const fetchUnviewedPatientSummaries = createAsyncThunk(
  "patientSummary/fetchUnviewed",
  async (_, { rejectWithValue }) => {
    try {
      const summaries = await getUnviewedPatientSummaries();
      return summaries;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch unviewed summaries");
    }
  }
);

// Fetch my summaries (Patient)
export const fetchMySummaries = createAsyncThunk(
  "patientSummary/fetchMySummaries",
  async (_, { rejectWithValue }) => {
    try {
      const summaries = await getMySummaries();
      return summaries;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch your summaries");
    }
  }
);

// Fetch patient summaries (Doctor viewing specific patient)
export const fetchPatientSummariesById = createAsyncThunk(
  "patientSummary/fetchPatientSummaries",
  async (patientUserId: number, { rejectWithValue }) => {
    try {
      const summaries = await getPatientSummaries(patientUserId);
      return summaries;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch patient summaries");
    }
  }
);

// Fetch single summary
export const fetchPatientSummary = createAsyncThunk(
  "patientSummary/fetchSummary",
  async (summaryId: number, { rejectWithValue }) => {
    try {
      const summary = await getPatientSummary(summaryId);
      return summary;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch summary");
    }
  }
);

// Create patient summary
export const createPatientSummaryThunk = createAsyncThunk(
  "patientSummary/create",
  async (data: CreatePatientSummaryRequest, { rejectWithValue }) => {
    try {
      const summary = await createPatientSummary(data);
      return summary;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create patient summary");
    }
  }
);

// Update patient summary
export const updatePatientSummaryThunk = createAsyncThunk(
  "patientSummary/update",
  async (
    { summaryId, data }: { summaryId: number; data: UpdatePatientSummaryRequest },
    { rejectWithValue }
  ) => {
    try {
      const summary = await updatePatientSummary(summaryId, data);
      return summary;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update patient summary");
    }
  }
);

// Download PDF
export const downloadPDFThunk = createAsyncThunk(
  "patientSummary/downloadPDF",
  async (summaryId: number, { rejectWithValue }) => {
    try {
      const blob = await downloadPatientSummaryPDF(summaryId);
      return { summaryId, blob };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to download PDF");
    }
  }
);

// Download Word
export const downloadWordThunk = createAsyncThunk(
  "patientSummary/downloadWord",
  async (summaryId: number, { rejectWithValue }) => {
    try {
      const blob = await downloadPatientSummaryWord(summaryId);
      return { summaryId, blob };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to download Word document");
    }
  }
);

// Slice
const patientSummarySlice = createSlice({
  name: "patientSummary",
  initialState,
  reducers: {
    clearSelectedSummary: (state) => {
      state.selectedSummary = null;
      state.selectedSummaryError = null;
    },
    clearErrors: (state) => {
      state.recentSummariesError = null;
      state.unviewedSummariesError = null;
      state.mySummariesError = null;
      state.patientSummariesError = null;
      state.selectedSummaryError = null;
      state.createError = null;
      state.updateError = null;
      state.downloadError = null;
    },
    setDownloading: (
      state,
      action: PayloadAction<{ id: number; type: "pdf" | "word" } | null>
    ) => {
      state.downloading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch recent summaries
    builder
      .addCase(fetchRecentPatientSummaries.pending, (state) => {
        state.recentSummariesLoading = true;
        state.recentSummariesError = null;
      })
      .addCase(fetchRecentPatientSummaries.fulfilled, (state, action) => {
        state.recentSummariesLoading = false;
        state.recentSummaries = action.payload;
      })
      .addCase(fetchRecentPatientSummaries.rejected, (state, action) => {
        state.recentSummariesLoading = false;
        state.recentSummariesError = action.payload as string;
      });

    // Fetch unviewed summaries
    builder
      .addCase(fetchUnviewedPatientSummaries.pending, (state) => {
        state.unviewedSummariesLoading = true;
        state.unviewedSummariesError = null;
      })
      .addCase(fetchUnviewedPatientSummaries.fulfilled, (state, action) => {
        state.unviewedSummariesLoading = false;
        state.unviewedSummaries = action.payload;
      })
      .addCase(fetchUnviewedPatientSummaries.rejected, (state, action) => {
        state.unviewedSummariesLoading = false;
        state.unviewedSummariesError = action.payload as string;
      });

    // Fetch my summaries
    builder
      .addCase(fetchMySummaries.pending, (state) => {
        state.mySummariesLoading = true;
        state.mySummariesError = null;
      })
      .addCase(fetchMySummaries.fulfilled, (state, action) => {
        state.mySummariesLoading = false;
        state.mySummaries = action.payload;
      })
      .addCase(fetchMySummaries.rejected, (state, action) => {
        state.mySummariesLoading = false;
        state.mySummariesError = action.payload as string;
      });

    // Fetch patient summaries
    builder
      .addCase(fetchPatientSummariesById.pending, (state) => {
        state.patientSummariesLoading = true;
        state.patientSummariesError = null;
      })
      .addCase(fetchPatientSummariesById.fulfilled, (state, action) => {
        state.patientSummariesLoading = false;
        state.patientSummaries = action.payload;
      })
      .addCase(fetchPatientSummariesById.rejected, (state, action) => {
        state.patientSummariesLoading = false;
        state.patientSummariesError = action.payload as string;
      });

    // Fetch single summary
    builder
      .addCase(fetchPatientSummary.pending, (state) => {
        state.selectedSummaryLoading = true;
        state.selectedSummaryError = null;
      })
      .addCase(fetchPatientSummary.fulfilled, (state, action) => {
        state.selectedSummaryLoading = false;
        state.selectedSummary = action.payload;
      })
      .addCase(fetchPatientSummary.rejected, (state, action) => {
        state.selectedSummaryLoading = false;
        state.selectedSummaryError = action.payload as string;
      });

    // Create summary
    builder
      .addCase(createPatientSummaryThunk.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createPatientSummaryThunk.fulfilled, (state, action) => {
        state.creating = false;
        state.recentSummaries.unshift(action.payload);
        state.unviewedSummaries.unshift(action.payload);
      })
      .addCase(createPatientSummaryThunk.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload as string;
      });

    // Update summary
    builder
      .addCase(updatePatientSummaryThunk.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updatePatientSummaryThunk.fulfilled, (state, action) => {
        state.updating = false;
        // Update in recent summaries
        const recentIndex = state.recentSummaries.findIndex((s) => s.id === action.payload.id);
        if (recentIndex !== -1) {
          state.recentSummaries[recentIndex] = action.payload;
        }
        // Update in unviewed summaries
        const unviewedIndex = state.unviewedSummaries.findIndex((s) => s.id === action.payload.id);
        if (unviewedIndex !== -1) {
          state.unviewedSummaries[unviewedIndex] = action.payload;
        }
        // Update selected summary
        if (state.selectedSummary?.id === action.payload.id) {
          state.selectedSummary = action.payload;
        }
      })
      .addCase(updatePatientSummaryThunk.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload as string;
      });

    // Download PDF
    builder
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
      });

    // Download Word
    builder
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

export const { clearSelectedSummary, clearErrors, setDownloading } = patientSummarySlice.actions;
export default patientSummarySlice.reducer;
