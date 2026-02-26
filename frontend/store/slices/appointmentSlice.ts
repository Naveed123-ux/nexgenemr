import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";

// ---- Types ----

export interface LabRequestSummary {
    id: number;
    request_type: "BRAIN_TUMOR" | "OTHER";
    status: "PENDING" | "ACCEPTED" | "COMPLETED" | "APPROVED" | "REJECTED";
    priority: string;
}

// This is now the single source of truth for an appointment object.
export interface Appointment {
    id: number;
    patient_id: number;
    patient_profile_id: number;
    doctor_user_id: number;
    patient_name: string;
    doctor_name: string;
    start_time: string;
    end_time: string;
    is_telehealth: boolean;
    status: string;
    reason_for_visit: string;
    google_meet_link: string | null;
    results?: string | null; // Optional results field for past appointments
    lab_requests: LabRequestSummary[];
}

// For semantic clarity in components, though it's the same shape as Appointment.
export type UpcomingAppointment = Appointment;

interface WeeklyApiResponse {
    appointments_by_day: Record<string, Appointment[]>;
}

// ---- State ----

interface AppointmentState {
    weekly: Appointment[];
    upcoming: UpcomingAppointment[];
    all: Appointment[]; // For the complete history
    weeklyStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    upcomingStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    allStatus: 'idle' | 'loading' | 'succeeded' | 'failed'; // Status for the history
    error: string | null;
}

const initialState: AppointmentState = {
    weekly: [],
    upcoming: [],
    all: [],
    weeklyStatus: 'idle',
    upcomingStatus: 'idle',
    allStatus: 'idle',
    error: null,
};

// ---- Async Thunks ----

export const fetchWeeklyAppointments = createAsyncThunk(
    'appointments/fetchWeekly',
    async (startDate: string, { rejectWithValue }) => {
        try {
            const response = await privateApi.get<WeeklyApiResponse>(`/appointments/doctor/week-appointments?start_date=${startDate}`);
            if (response.data && response.data.appointments_by_day) {
                return Object.values(response.data.appointments_by_day).flat();
            }
            return [];
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || "Failed to fetch weekly appointments.");
        }
    }
);

export const fetchUpcomingAppointments = createAsyncThunk(
    'appointments/fetchUpcoming',
    async (_, { rejectWithValue }) => {
        try {
            const response = await privateApi.get<UpcomingAppointment[]>('/appointments/doctor/upcoming');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || "Failed to fetch upcoming appointments.");
        }
    }
);

export const fetchAllAppointments = createAsyncThunk(
    'appointments/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await privateApi.get<Appointment[]>('/appointments/doctor/all');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || "Failed to fetch appointment history.");
        }
    }
);

export const cancelAppointment = createAsyncThunk(
    'appointments/cancel',
    async (appointmentId: number, { rejectWithValue }) => {
        try {
            await privateApi.delete(`/appointments/appointment/${appointmentId}`);
            return appointmentId; // Return the ID on success for filtering state
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || "Failed to cancel appointment.");
        }
    }
);

export const rescheduleAppointment = createAsyncThunk(
    'appointments/reschedule',
    async ({ appointmentId, new_slot_id }: { appointmentId: number, new_slot_id: number }, { dispatch, rejectWithValue }) => {
        try {
            await privateApi.put(`/appointments/${appointmentId}/reschedule`, { new_slot_id });
            // Refetch data to ensure all lists are up-to-date after a reschedule
            dispatch(fetchUpcomingAppointments());
            dispatch(fetchAllAppointments());
            return;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || "Failed to reschedule appointment.");
        }
    }
);

export const updateAppointmentResults = createAsyncThunk(
    'appointments/updateResults',
    async ({ appointmentId, results }: { appointmentId: number, results: string }, { rejectWithValue }) => {
        try {
            const response = await privateApi.put<Appointment>(`/appointments/${appointmentId}/results`, { results });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || "Failed to update results.");
        }
    }
);

// ---- Slice Definition ----

const appointmentSlice = createSlice({
    name: 'appointments',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // Weekly Appointments (Calendar View)
            .addCase(fetchWeeklyAppointments.pending, (state) => {
                state.weeklyStatus = 'loading';
            })
            .addCase(fetchWeeklyAppointments.fulfilled, (state, action: PayloadAction<Appointment[]>) => {
                state.weeklyStatus = 'succeeded';
                state.weekly = action.payload;
            })
            .addCase(fetchWeeklyAppointments.rejected, (state, action) => {
                state.weeklyStatus = 'failed';
                state.error = action.payload as string;
            })
            // Upcoming Appointments (Card View)
            .addCase(fetchUpcomingAppointments.pending, (state) => {
                state.upcomingStatus = 'loading';
            })
            .addCase(fetchUpcomingAppointments.fulfilled, (state, action: PayloadAction<UpcomingAppointment[]>) => {
                state.upcomingStatus = 'succeeded';
                state.upcoming = action.payload;
            })
            .addCase(fetchUpcomingAppointments.rejected, (state, action) => {
                state.upcomingStatus = 'failed';
                state.error = action.payload as string;
            })
            // All Appointments (History View)
            .addCase(fetchAllAppointments.pending, (state) => {
                state.allStatus = 'loading';
            })
            .addCase(fetchAllAppointments.fulfilled, (state, action: PayloadAction<Appointment[]>) => {
                state.allStatus = 'succeeded';
                // Sort by start time, descending (newest first)
                state.all = action.payload.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
            })
            .addCase(fetchAllAppointments.rejected, (state, action) => {
                state.allStatus = 'failed';
                state.error = action.payload as string;
            })
            // Handle state updates for actions that affect all lists
            .addCase(cancelAppointment.fulfilled, (state, action: PayloadAction<number>) => {
                const appointmentId = action.payload;
                state.upcoming = state.upcoming.filter(appt => appt.id !== appointmentId);
                state.all = state.all.filter(appt => appt.id !== appointmentId);
                state.weekly = state.weekly.filter(appt => appt.id !== appointmentId);
            })
            .addCase(updateAppointmentResults.fulfilled, (state, action: PayloadAction<Appointment>) => {
                const updatedAppt = action.payload;
                const updateInList = (appt: Appointment) => appt.id === updatedAppt.id ? updatedAppt : appt;

                state.upcoming = state.upcoming.map(updateInList);
                state.all = state.all.map(updateInList);
                state.weekly = state.weekly.map(updateInList);
            });
    },
});

export default appointmentSlice.reducer;