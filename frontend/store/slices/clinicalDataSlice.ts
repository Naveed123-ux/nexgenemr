import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { 
    addVitalsForAppointment,
    getVitalsHistoryForPatient,
    updateMedicalHistory as apiUpdateMedicalHistory,
    getMedicalHistory
} from "@/app/_apis/doctor/clinicalData";

// --- Types ---
interface Vitals {
    id: number;
    blood_pressure: string;
    heart_rate: number;
    respiratory_rate: number;
    temperature: number;
    oxygen_saturation: number;
    pain_level: string;
}

interface VitalsHistoryItem {
    appointment_date: string;
    vitals: Vitals;
}

interface MedicalHistory {
    allergies: string[];
    current_medications: string[];
    past_medical_history: string[];
}

interface ClinicalDataState {
    vitals: VitalsHistoryItem[];
    history: MedicalHistory | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

// --- Initial State ---
const initialState: ClinicalDataState = {
    vitals: [],
    history: null,
    status: 'idle',
    error: null,
};

// --- Async Thunks ---
export const fetchVitalsHistory = createAsyncThunk('clinicalData/fetchVitals', async (patientUserId: number, { rejectWithValue }) => {
    try {
        return await getVitalsHistoryForPatient(patientUserId);
    } catch (error: any) {
        return rejectWithValue(error.message);
    }
});

export const addVitals = createAsyncThunk('clinicalData/addVitals', async (payload: { patient_user_id: number; appointment_id: number; vitalsData: any }, { dispatch, rejectWithValue }) => {
    try {
        await addVitalsForAppointment(payload.patient_user_id, payload.appointment_id, payload.vitalsData);
        dispatch(fetchVitalsHistory(payload.patient_user_id)); // Refetch history after adding
    } catch (error: any) {
        return rejectWithValue(error.message);
    }
});

export const fetchMedicalHistory = createAsyncThunk('clinicalData/fetchHistory', async (patientUserId: number, { rejectWithValue }) => {
    try {
        return await getMedicalHistory(patientUserId);
    } catch (error: any) {
        return rejectWithValue(error.message);
    }
});

export const updateMedicalHistory = createAsyncThunk('clinicalData/updateHistory', async (payload: { patient_user_id: number; historyData: any }, { rejectWithValue }) => {
    try {
        return await apiUpdateMedicalHistory(payload.patient_user_id, payload.historyData);
    } catch (error: any) {
        return rejectWithValue(error.message);
    }
});


// --- Slice Definition ---
const clinicalDataSlice = createSlice({
    name: "clinicalData",
    initialState,
    reducers: {
        resetClinicalData: (state) => {
            state.vitals = [];
            state.history = null;
            state.status = 'idle';
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Specific fulfilled states must come before matchers
            .addCase(fetchVitalsHistory.fulfilled, (state, action: PayloadAction<VitalsHistoryItem[]>) => {
                state.status = 'succeeded';
                state.vitals = action.payload.sort((a,b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime());
            })
            .addCase(addVitals.fulfilled, (state) => {
                state.status = 'succeeded';
            })
            .addCase(fetchMedicalHistory.fulfilled, (state, action: PayloadAction<MedicalHistory>) => {
                state.status = 'succeeded';
                state.history = action.payload;
            })
            .addCase(updateMedicalHistory.fulfilled, (state, action: PayloadAction<MedicalHistory>) => {
                state.status = 'succeeded';
                state.history = action.payload;
            })
            // Shared pending state
            .addMatcher(
                (action) => action.type.startsWith('clinicalData/') && action.type.endsWith('/pending'),
                (state) => { state.status = 'loading'; state.error = null; }
            )
            // Shared rejected state with a type predicate to fix the error
            .addMatcher(
                (action): action is PayloadAction<string> => action.type.startsWith('clinicalData/') && action.type.endsWith('/rejected'),
                (state, action) => { state.status = 'failed'; state.error = action.payload; }
            );
    }
});

export const { resetClinicalData } = clinicalDataSlice.actions;
export default clinicalDataSlice.reducer;

