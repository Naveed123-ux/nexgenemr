import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";

// Type based on your API response
export interface AvailableSlot {
    id: number;
    doctor_user_id: number;
    start_time: string;
    end_time: string;
    status: string;
}

interface AvailableSlotsState {
    slots: AvailableSlot[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: AvailableSlotsState = {
    slots: [],
    status: 'idle',
    error: null,
};

// Thunk to fetch all available slots for the logged-in doctor
export const fetchAllAvailableSlots = createAsyncThunk(
    'availableSlots/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await privateApi.get<AvailableSlot[]>('/me/all-available-slots');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || "Failed to fetch available slots.");
        }
    }
);

const availableSlotsSlice = createSlice({
    name: 'availableSlots',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchAllAvailableSlots.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAllAvailableSlots.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.slots = action.payload;
            })
            .addCase(fetchAllAvailableSlots.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export default availableSlotsSlice.reducer;