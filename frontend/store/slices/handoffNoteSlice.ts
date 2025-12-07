import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  createHandoffNote,
  getHandoffNote,
  getPatientHandoffNotes,
  updateHandoffNote,
  acknowledgeHandoffNote,
  downloadHandoffNotePDF,
  getRecentHandoffNotes,
  getUnacknowledgedHandoffNotes,
  HandoffNote,
  CreateHandoffNoteRequest,
  UpdateHandoffNoteRequest,
} from "@/app/_apis/handoffNotes";

// State interface
interface HandoffNoteState {
  // Recent handoff notes
  recentNotes: HandoffNote[];
  recentNotesLoading: boolean;
  recentNotesError: string | null;

  // Unacknowledged notes
  unacknowledgedNotes: HandoffNote[];
  unacknowledgedNotesLoading: boolean;
  unacknowledgedNotesError: string | null;

  // Patient handoff notes
  patientNotes: HandoffNote[];
  patientNotesLoading: boolean;
  patientNotesError: string | null;

  // Selected note
  selectedNote: HandoffNote | null;
  selectedNoteLoading: boolean;
  selectedNoteError: string | null;

  // Create/Update
  creating: boolean;
  createError: string | null;
  updating: boolean;
  updateError: string | null;

  // Acknowledge
  acknowledging: number | null; // note ID being acknowledged
  acknowledgeError: string | null;

  // Download
  downloading: number | null; // note ID being downloaded
  downloadError: string | null;
}

const initialState: HandoffNoteState = {
  recentNotes: [],
  recentNotesLoading: false,
  recentNotesError: null,

  unacknowledgedNotes: [],
  unacknowledgedNotesLoading: false,
  unacknowledgedNotesError: null,

  patientNotes: [],
  patientNotesLoading: false,
  patientNotesError: null,

  selectedNote: null,
  selectedNoteLoading: false,
  selectedNoteError: null,

  creating: false,
  createError: null,
  updating: false,
  updateError: null,

  acknowledging: null,
  acknowledgeError: null,

  downloading: null,
  downloadError: null,
};

// Async thunks

// Fetch recent handoff notes
export const fetchRecentHandoffNotes = createAsyncThunk(
  "handoffNote/fetchRecent",
  async (limit: number = 20, { rejectWithValue }) => {
    try {
      const notes = await getRecentHandoffNotes(limit);
      return notes;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch recent handoff notes");
    }
  }
);

// Fetch unacknowledged handoff notes
export const fetchUnacknowledgedHandoffNotes = createAsyncThunk(
  "handoffNote/fetchUnacknowledged",
  async (_, { rejectWithValue }) => {
    try {
      const notes = await getUnacknowledgedHandoffNotes();
      return notes;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch unacknowledged handoff notes");
    }
  }
);

// Fetch patient handoff notes
export const fetchPatientHandoffNotes = createAsyncThunk(
  "handoffNote/fetchPatientNotes",
  async (patientUserId: number, { rejectWithValue }) => {
    try {
      const notes = await getPatientHandoffNotes(patientUserId);
      return notes;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch patient handoff notes");
    }
  }
);

// Fetch single handoff note
export const fetchHandoffNote = createAsyncThunk(
  "handoffNote/fetchNote",
  async (noteId: number, { rejectWithValue }) => {
    try {
      const note = await getHandoffNote(noteId);
      return note;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch handoff note");
    }
  }
);

// Create handoff note
export const createHandoffNoteThunk = createAsyncThunk(
  "handoffNote/create",
  async (data: CreateHandoffNoteRequest, { rejectWithValue }) => {
    try {
      const note = await createHandoffNote(data);
      return note;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create handoff note");
    }
  }
);

// Update handoff note
export const updateHandoffNoteThunk = createAsyncThunk(
  "handoffNote/update",
  async ({ noteId, data }: { noteId: number; data: UpdateHandoffNoteRequest }, { rejectWithValue }) => {
    try {
      const note = await updateHandoffNote(noteId, data);
      return note;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update handoff note");
    }
  }
);

// Acknowledge handoff note
export const acknowledgeHandoffNoteThunk = createAsyncThunk(
  "handoffNote/acknowledge",
  async (noteId: number, { rejectWithValue }) => {
    try {
      const note = await acknowledgeHandoffNote(noteId);
      return note;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to acknowledge handoff note");
    }
  }
);

// Download PDF
export const downloadPDFThunk = createAsyncThunk(
  "handoffNote/downloadPDF",
  async (noteId: number, { rejectWithValue }) => {
    try {
      const blob = await downloadHandoffNotePDF(noteId);
      return { noteId, blob };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to download PDF");
    }
  }
);

// Slice
const handoffNoteSlice = createSlice({
  name: "handoffNote",
  initialState,
  reducers: {
    clearSelectedNote: (state) => {
      state.selectedNote = null;
      state.selectedNoteError = null;
    },
    clearErrors: (state) => {
      state.recentNotesError = null;
      state.unacknowledgedNotesError = null;
      state.patientNotesError = null;
      state.selectedNoteError = null;
      state.createError = null;
      state.updateError = null;
      state.acknowledgeError = null;
      state.downloadError = null;
    },
    setDownloading: (state, action: PayloadAction<number | null>) => {
      state.downloading = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch recent notes
    builder
      .addCase(fetchRecentHandoffNotes.pending, (state) => {
        state.recentNotesLoading = true;
        state.recentNotesError = null;
      })
      .addCase(fetchRecentHandoffNotes.fulfilled, (state, action) => {
        state.recentNotesLoading = false;
        state.recentNotes = action.payload;
      })
      .addCase(fetchRecentHandoffNotes.rejected, (state, action) => {
        state.recentNotesLoading = false;
        state.recentNotesError = action.payload as string;
      });

    // Fetch unacknowledged notes
    builder
      .addCase(fetchUnacknowledgedHandoffNotes.pending, (state) => {
        state.unacknowledgedNotesLoading = true;
        state.unacknowledgedNotesError = null;
      })
      .addCase(fetchUnacknowledgedHandoffNotes.fulfilled, (state, action) => {
        state.unacknowledgedNotesLoading = false;
        state.unacknowledgedNotes = action.payload;
      })
      .addCase(fetchUnacknowledgedHandoffNotes.rejected, (state, action) => {
        state.unacknowledgedNotesLoading = false;
        state.unacknowledgedNotesError = action.payload as string;
      });

    // Fetch patient notes
    builder
      .addCase(fetchPatientHandoffNotes.pending, (state) => {
        state.patientNotesLoading = true;
        state.patientNotesError = null;
      })
      .addCase(fetchPatientHandoffNotes.fulfilled, (state, action) => {
        state.patientNotesLoading = false;
        state.patientNotes = action.payload;
      })
      .addCase(fetchPatientHandoffNotes.rejected, (state, action) => {
        state.patientNotesLoading = false;
        state.patientNotesError = action.payload as string;
      });

    // Fetch single note
    builder
      .addCase(fetchHandoffNote.pending, (state) => {
        state.selectedNoteLoading = true;
        state.selectedNoteError = null;
      })
      .addCase(fetchHandoffNote.fulfilled, (state, action) => {
        state.selectedNoteLoading = false;
        state.selectedNote = action.payload;
      })
      .addCase(fetchHandoffNote.rejected, (state, action) => {
        state.selectedNoteLoading = false;
        state.selectedNoteError = action.payload as string;
      });

    // Create note
    builder
      .addCase(createHandoffNoteThunk.pending, (state) => {
        state.creating = true;
        state.createError = null;
      })
      .addCase(createHandoffNoteThunk.fulfilled, (state, action) => {
        state.creating = false;
        state.recentNotes.unshift(action.payload);
      })
      .addCase(createHandoffNoteThunk.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload as string;
      });

    // Update note
    builder
      .addCase(updateHandoffNoteThunk.pending, (state) => {
        state.updating = true;
        state.updateError = null;
      })
      .addCase(updateHandoffNoteThunk.fulfilled, (state, action) => {
        state.updating = false;
        // Update in recent notes
        const index = state.recentNotes.findIndex((n) => n.id === action.payload.id);
        if (index !== -1) {
          state.recentNotes[index] = action.payload;
        }
        // Update selected note
        if (state.selectedNote?.id === action.payload.id) {
          state.selectedNote = action.payload;
        }
      })
      .addCase(updateHandoffNoteThunk.rejected, (state, action) => {
        state.updating = false;
        state.updateError = action.payload as string;
      });

    // Acknowledge note
    builder
      .addCase(acknowledgeHandoffNoteThunk.pending, (state, action) => {
        state.acknowledging = action.meta.arg;
        state.acknowledgeError = null;
      })
      .addCase(acknowledgeHandoffNoteThunk.fulfilled, (state, action) => {
        state.acknowledging = null;
        // Update in recent notes
        const recentIndex = state.recentNotes.findIndex((n) => n.id === action.payload.id);
        if (recentIndex !== -1) {
          state.recentNotes[recentIndex] = action.payload;
        }
        // Remove from unacknowledged
        state.unacknowledgedNotes = state.unacknowledgedNotes.filter(
          (n) => n.id !== action.payload.id
        );
        // Update selected note
        if (state.selectedNote?.id === action.payload.id) {
          state.selectedNote = action.payload;
        }
      })
      .addCase(acknowledgeHandoffNoteThunk.rejected, (state, action) => {
        state.acknowledging = null;
        state.acknowledgeError = action.payload as string;
      });

    // Download PDF
    builder
      .addCase(downloadPDFThunk.pending, (state, action) => {
        state.downloading = action.meta.arg;
        state.downloadError = null;
      })
      .addCase(downloadPDFThunk.fulfilled, (state) => {
        state.downloading = null;
      })
      .addCase(downloadPDFThunk.rejected, (state, action) => {
        state.downloading = null;
        state.downloadError = action.payload as string;
      });
  },
});

export const { clearSelectedNote, clearErrors, setDownloading } = handoffNoteSlice.actions;
export default handoffNoteSlice.reducer;
