import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios"; // Adjust the import path to your configured axios instance

// --- Types ---

/**
 * Defines the structure of the SOAP note object itself.
 */
export interface SoapNote {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
}

/**
 * Defines the structure of the full API response for a SOAP note.
 */
export interface SoapNoteResponse {
    transcript: string;
    soap_note: SoapNote;
    soap_note_id: number | null; // The ID is null if the note doesn't exist yet
}


export interface Highlight {
    text: string;
    severity: "low" | "medium" | "high";
    reason: string;
}
/**
 * Defines the shape of this slice's state.
 */
interface SoapNoteState {
    data: SoapNoteResponse | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
      highlights: Highlight[] | null;
    highlightStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

// --- Initial State ---

const initialState: SoapNoteState = {
    data: null,
    status: 'idle', // 'idle' means we haven't fetched anything yet
    error: null,
     highlights: null,
    highlightStatus: 'idle',
};

// --- Async Thunk ---

export const fetchContextualHighlights = createAsyncThunk(
    'soapNote/fetchHighlights',
    async (soapNoteId: number, { rejectWithValue }) => {
        try {
            const response = await privateApi.get<{ highlights: Highlight[] }>(`/highlights/contextual/${soapNoteId}`);
            return response.data.highlights;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || "Failed to fetch highlights.");
        }
    }
);
/**
 * Fetches a SOAP note for a specific appointment by its ID.
 * This is an async action that will dispatch pending/fulfilled/rejected actions.
 */
export const fetchSoapNoteByAppointmentId = createAsyncThunk(
    'soapNote/fetchByAppointmentId',
    async (appointmentId: number, { rejectWithValue }) => {
        try {
            const response = await privateApi.get<SoapNoteResponse>(`/soap-notes/appointment/${appointmentId}`);
            return response.data;
        } catch (error: any) {
            // Extracts a user-friendly error message from the API response or provides a fallback
            const errorMessage = error.response?.data?.detail || "Failed to fetch SOAP note.";
            return rejectWithValue(errorMessage);
        }
    }
);

// --- Slice Definition ---

const soapNoteSlice = createSlice({
    name: "soapNote",
    initialState,
    reducers: {
        /**
         * Action to reset the slice state back to its initial condition.
         * Useful for clearing old data when a dialog is closed.
         */
        resetSoapNoteState: (state) => {
            state.data = null;
            state.status = 'idle';
            state.error = null;
        },
    },
    // Handles the state changes based on the async thunk's lifecycle
    extraReducers: (builder) => {
        builder
            .addCase(fetchSoapNoteByAppointmentId.pending, (state) => {
                state.status = 'loading';
                state.data = null; // Clear previous data on a new fetch
                state.error = null;
            })
            .addCase(fetchSoapNoteByAppointmentId.fulfilled, (state, action: PayloadAction<SoapNoteResponse>) => {
                state.status = 'succeeded';
                state.data = action.payload;
            })
            .addCase(fetchSoapNoteByAppointmentId.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            .addCase(fetchContextualHighlights.pending, (state) => {
                state.highlightStatus = 'loading';
            })
            .addCase(fetchContextualHighlights.fulfilled, (state, action: PayloadAction<Highlight[]>) => {
                state.highlightStatus = 'succeeded';
                state.highlights = action.payload;
            })
            .addCase(fetchContextualHighlights.rejected, (state, action) => {
                state.highlightStatus = 'failed';
                state.error = action.payload as string; // Can reuse the main error field
            });
    },
});

// --- Exports ---

// Export the synchronous action
export const { resetSoapNoteState } = soapNoteSlice.actions;

// Export the reducer to be included in the store
export default soapNoteSlice.reducer;