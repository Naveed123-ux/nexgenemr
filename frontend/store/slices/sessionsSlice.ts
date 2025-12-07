// Unified Session System Redux Slice
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";
import { handleApiError, withRetry } from "@/lib/error-handling";
import {
  // Core types
  DayOfWeek,
  SessionType,
  SlotType,
  SlotModality,
  RecurrenceConfig,
  SlotData,
  SessionCreateRequest,
  SessionPatternResponse,
  SessionResponse,
  SlotResponse,
  SessionFilters,
  ErrorInfo,
  SessionsState
} from "@/lib/session-api-types";

// Re-export types for backward compatibility
export type {
  DayOfWeek,
  SessionType,
  SlotType,
  SlotModality,
  RecurrenceConfig,
  SlotData,
  SessionCreateRequest,
  SessionPatternResponse,
  SessionResponse,
  SlotResponse,
  SessionFilters,
  ErrorInfo,
  SessionsState
};

// Legacy interfaces for backward compatibility (will be removed in future tasks)
export interface SimpleSession {
  name: string;
  day_of_week: string; // Full name: "Monday", "Tuesday", etc.
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  session_type: "on_site" | "off_site";
  duration_weeks: number; // 1-52
}

export interface AdvancedSession {
  name: string;
  session_type: "on_site" | "off_site";
  start_time_of_day: string; // HH:MM format
  end_time_of_day: string; // HH:MM format
  recurrence_config: RecurrenceConfig;
}

// Legacy session creation request (will be removed in future tasks)
export interface CreateSessionRequest {
  is_recurring: boolean;
  simple_session?: SimpleSession;
  advanced_session?: AdvancedSession;
}



const initialState: SessionsState = {
  patterns: [],
  currentPatternSessions: [],
  availableSessions: [],
  availableSlots: [],
  doctorAvailableSlots: [],
  status: "idle",
  createStatus: "idle",
  deleteStatus: "idle",
  availableSessionsStatus: "idle",
  availableSlotsStatus: "idle",
  doctorAvailableSlotsStatus: "idle",
  error: null,
  createError: null,
  deleteError: null,
  availableSessionsError: null,
  availableSlotsError: null,
  doctorAvailableSlotsError: null,
};

// ---- Async Thunks ----

/**
 * Create a new session pattern using unified API
 * Supports both legacy and new request formats
 */
export const createSessionPattern = createAsyncThunk(
  "sessions/createPattern",
  async (sessionData: SessionCreateRequest | CreateSessionRequest, { rejectWithValue }) => {
    try {
      // Convert legacy format to new unified format if needed
      let requestData: SessionCreateRequest;
      
      if ('is_recurring' in sessionData) {
        // Legacy format - convert to new format
        const legacyData = sessionData as CreateSessionRequest;
        if (legacyData.simple_session) {
          requestData = {
            name: legacyData.simple_session.name,
            session_type: legacyData.simple_session.session_type,
            start_time: legacyData.simple_session.start_time,
            end_time: legacyData.simple_session.end_time,
            day_of_week: legacyData.simple_session.day_of_week as DayOfWeek,
            duration_weeks: legacyData.simple_session.duration_weeks,
          };
        } else if (legacyData.advanced_session) {
          requestData = {
            name: legacyData.advanced_session.name,
            session_type: legacyData.advanced_session.session_type,
            start_time: legacyData.advanced_session.start_time_of_day,
            end_time: legacyData.advanced_session.end_time_of_day,
            recurrence_config: legacyData.advanced_session.recurrence_config,
          };
        } else {
          const error = handleApiError(new Error("Invalid session data provided."), {
            action: 'createSessionPattern',
            sessionData
          });
          return rejectWithValue({
            message: error.userMessage,
            type: error.type
          });
        }
      } else {
        // New format - use as is
        requestData = sessionData as SessionCreateRequest;
      }

      // Use retry mechanism for network resilience
      const response = await withRetry(
        () => privateApi.post<SessionPatternResponse>("/sessions/", requestData),
        {
          maxRetries: 2,
          delayMs: 1000,
        }
      );
      
      return response.data;
    } catch (error: any) {
      const apiError = handleApiError(error, {
        action: 'createSessionPattern',
        requestData: sessionData
      });
      
      return rejectWithValue({
        message: apiError.userMessage,
        type: apiError.type,
        shouldRedirect: apiError.type === 'authentication'
      });
    }
  }
);

/**
 * Fetch all session patterns for the logged-in doctor
 */
export const fetchSessionPatterns = createAsyncThunk(
  "sessions/fetchPatterns",
  async (_, { rejectWithValue }) => {
    try {
      // Use retry mechanism for network resilience
      const response = await withRetry(
        () => privateApi.get<SessionPatternResponse[]>("/sessions/patterns"),
        {
          maxRetries: 2,
          delayMs: 1000,
        }
      );
      
      return response.data;
    } catch (error: any) {
      const apiError = handleApiError(error, {
        action: 'fetchSessionPatterns'
      });
      
      return rejectWithValue({
        message: apiError.userMessage,
        type: apiError.type,
        shouldRedirect: apiError.type === 'authentication'
      });
    }
  }
);

/**
 * Delete a session pattern by recurrence_group_id
 */
export const deleteSessionPattern = createAsyncThunk(
  "sessions/deletePattern",
  async (recurrenceGroupId: string, { rejectWithValue }) => {
    try {
      // Use retry mechanism for network resilience
      await withRetry(
        () => privateApi.delete(`/sessions/patterns/${recurrenceGroupId}`),
        {
          maxRetries: 2,
          delayMs: 1000,
        }
      );
      
      return recurrenceGroupId;
    } catch (error: any) {
      const apiError = handleApiError(error, {
        action: 'deleteSessionPattern',
        recurrenceGroupId
      });
      
      return rejectWithValue({
        message: apiError.userMessage,
        type: apiError.type,
        shouldRedirect: apiError.type === 'authentication'
      });
    }
  }
);

/**
 * Fetch sessions for a specific pattern
 */
export const fetchPatternSessions = createAsyncThunk(
  "sessions/fetchPatternSessions",
  async (
    {
      recurrenceGroupId,
      startDate,
      endDate,
    }: { recurrenceGroupId: string; startDate?: string; endDate?: string },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      // Use retry mechanism for network resilience
      const response = await withRetry(
        () => privateApi.get<SessionResponse[]>(
          `/sessions/patterns/${recurrenceGroupId}/sessions?${params.toString()}`
        ),
        {
          maxRetries: 2,
          delayMs: 1000,
        }
      );
      
      return response.data;
    } catch (error: any) {
      const apiError = handleApiError(error, {
        action: 'fetchPatternSessions',
        recurrenceGroupId,
        startDate,
        endDate
      });
      
      return rejectWithValue({
        message: apiError.userMessage,
        type: apiError.type,
        shouldRedirect: apiError.type === 'authentication'
      });
    }
  }
);

/**
 * Fetch available sessions for booking
 */
export const fetchAvailableSessions = createAsyncThunk(
  "sessions/fetchAvailable",
  async (filters: SessionFilters | undefined, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.doctorId) params.append("doctor_id", filters.doctorId.toString());
      if (filters?.sessionType) params.append("session_type", filters.sessionType);
      if (filters?.startDate) params.append("start_date", filters.startDate);
      if (filters?.endDate) params.append("end_date", filters.endDate);

      // Use retry mechanism for network resilience
      const response = await withRetry(
        () => privateApi.get<SessionResponse[]>(
          `/sessions/available?${params.toString()}`
        ),
        {
          maxRetries: 2,
          delayMs: 1000,
        }
      );
      
      return response.data;
    } catch (error: any) {
      const apiError = handleApiError(error, {
        action: 'fetchAvailableSessions',
        filters
      });
      
      return rejectWithValue({
        message: apiError.userMessage,
        type: apiError.type,
        shouldRedirect: apiError.type === 'authentication'
      });
    }
  }
);

/**
 * Fetch available slots for a specific session
 */
export const fetchAvailableSlots = createAsyncThunk(
  "sessions/fetchAvailableSlots",
  async (sessionId: number, { rejectWithValue }) => {
    try {
      // Use retry mechanism for network resilience
      const response = await withRetry(
        () => privateApi.get<SlotResponse[]>(
          `/sessions/${sessionId}/slots/available`
        ),
        {
          maxRetries: 2,
          delayMs: 1000,
        }
      );
      
      return response.data;
    } catch (error: any) {
      const apiError = handleApiError(error, {
        action: 'fetchAvailableSlots',
        sessionId
      });
      
      return rejectWithValue({
        message: apiError.userMessage,
        type: apiError.type,
        shouldRedirect: apiError.type === 'authentication'
      });
    }
  }
);

/**
 * Fetch available slots for a specific doctor (NEW APPOINTMENT API)
 */
export const fetchDoctorAvailableSlots = createAsyncThunk(
  "sessions/fetchDoctorAvailableSlots",
  async (
    {
      doctorId,
      startDate,
      endDate,
      slotType,
      modality,
      onlyAvailable = true
    }: {
      doctorId: number;
      startDate?: string;
      endDate?: string;
      slotType?: SlotType;
      modality?: SlotModality;
      onlyAvailable?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (slotType) params.append('slot_type', slotType);
      if (modality) params.append('modality', modality);

      const response = await withRetry(
        () => privateApi.get<SlotResponse[]>(
          `/appointments/available-slots/${doctorId}?${params.toString()}`
        ),
        {
          maxRetries: 2,
          delayMs: 1000,
        }
      );

      // Filter out blocked/booked slots if requested
      let slots = response.data;
      if (onlyAvailable) {
        slots = slots.filter(slot => !slot.is_blocked && !slot.is_booked);
      }
      
      return slots;
    } catch (error: any) {
      const apiError = handleApiError(error, {
        action: 'fetchDoctorAvailableSlots',
        doctorId,
        startDate,
        endDate
      });
      
      return rejectWithValue({
        message: apiError.userMessage,
        type: apiError.type,
        shouldRedirect: apiError.type === 'authentication'
      });
    }
  }
);

/**
 * Fetch available slots for logged-in doctor (NEW APPOINTMENT API)
 */
export const fetchMyAvailableSlots = createAsyncThunk(
  "sessions/fetchMyAvailableSlots",
  async (
    {
      startDate,
      endDate,
      slotType,
      modality,
      onlyAvailable = true
    }: {
      startDate?: string;
      endDate?: string;
      slotType?: SlotType;
      modality?: SlotModality;
      onlyAvailable?: boolean;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (slotType) params.append('slot_type', slotType);
      if (modality) params.append('modality', modality);

      const response = await withRetry(
        () => privateApi.get<SlotResponse[]>(
          `/appointments/me/available-slots?${params.toString()}`
        ),
        {
          maxRetries: 2,
          delayMs: 1000,
        }
      );

      // Filter out blocked/booked slots if requested
      let slots = response.data;
      if (onlyAvailable) {
        slots = slots.filter(slot => !slot.is_blocked && !slot.is_booked);
      }
      
      return slots;
    } catch (error: any) {
      const apiError = handleApiError(error, {
        action: 'fetchMyAvailableSlots',
        startDate,
        endDate
      });
      
      return rejectWithValue({
        message: apiError.userMessage,
        type: apiError.type,
        shouldRedirect: apiError.type === 'authentication'
      });
    }
  }
);

/**
 * Block a specific slot (NEW APPOINTMENT API)
 */
export const blockAppointmentSlot = createAsyncThunk(
  "sessions/blockAppointmentSlot",
  async (slotId: number, { rejectWithValue }) => {
    try {
      const response = await withRetry(
        () => privateApi.post<SlotResponse>(`/appointments/slot/${slotId}/block`),
        {
          maxRetries: 2,
          delayMs: 1000,
        }
      );
      
      return response.data;
    } catch (error: any) {
      const apiError = handleApiError(error, {
        action: 'blockAppointmentSlot',
        slotId
      });
      
      return rejectWithValue({
        message: apiError.userMessage,
        type: apiError.type,
        shouldRedirect: apiError.type === 'authentication'
      });
    }
  }
);

/**
 * Unblock a specific slot (NEW APPOINTMENT API)
 */
export const unblockAppointmentSlot = createAsyncThunk(
  "sessions/unblockAppointmentSlot",
  async (slotId: number, { rejectWithValue }) => {
    try {
      const response = await withRetry(
        () => privateApi.post<SlotResponse>(`/appointments/slot/${slotId}/unblock`),
        {
          maxRetries: 2,
          delayMs: 1000,
        }
      );
      
      return response.data;
    } catch (error: any) {
      const apiError = handleApiError(error, {
        action: 'unblockAppointmentSlot',
        slotId
      });
      
      return rejectWithValue({
        message: apiError.userMessage,
        type: apiError.type,
        shouldRedirect: apiError.type === 'authentication'
      });
    }
  }
);

// ---- Slice Definition ----
const sessionsSlice = createSlice({
  name: "sessions",
  initialState,
  reducers: {
    clearCreateStatus: (state) => {
      state.createStatus = "idle";
      state.createError = null;
    },
    clearDeleteStatus: (state) => {
      state.deleteStatus = "idle";
      state.deleteError = null;
    },
    clearAvailableSessionsStatus: (state) => {
      state.availableSessionsStatus = "idle";
      state.availableSessionsError = null;
    },
    clearAvailableSlotsStatus: (state) => {
      state.availableSlotsStatus = "idle";
      state.availableSlotsError = null;
    },
    clearDoctorAvailableSlotsStatus: (state) => {
      state.doctorAvailableSlotsStatus = "idle";
      state.doctorAvailableSlotsError = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCreateError: (state) => {
      state.createError = null;
    },
    clearDeleteError: (state) => {
      state.deleteError = null;
    },
    clearAvailableSessionsError: (state) => {
      state.availableSessionsError = null;
    },
    clearAvailableSlotsError: (state) => {
      state.availableSlotsError = null;
    },
    clearDoctorAvailableSlotsError: (state) => {
      state.doctorAvailableSlotsError = null;
    },
    clearAllErrors: (state) => {
      state.error = null;
      state.createError = null;
      state.deleteError = null;
      state.availableSessionsError = null;
      state.availableSlotsError = null;
      state.doctorAvailableSlotsError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Session Pattern
      .addCase(createSessionPattern.pending, (state) => {
        state.createStatus = "loading";
        state.createError = null;
      })
      .addCase(
        createSessionPattern.fulfilled,
        (state, action: PayloadAction<SessionPatternResponse>) => {
          state.createStatus = "succeeded";
          state.createError = null;
          state.patterns.unshift(action.payload); // Add to beginning
        }
      )
      .addCase(createSessionPattern.rejected, (state, action) => {
        state.createStatus = "failed";
        state.createError = action.payload as ErrorInfo;
      })

      // Fetch Session Patterns
      .addCase(fetchSessionPatterns.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchSessionPatterns.fulfilled,
        (state, action: PayloadAction<SessionPatternResponse[]>) => {
          state.status = "succeeded";
          state.error = null;
          state.patterns = action.payload;
        }
      )
      .addCase(fetchSessionPatterns.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as ErrorInfo;
      })

      // Delete Session Pattern
      .addCase(deleteSessionPattern.pending, (state) => {
        state.deleteStatus = "loading";
        state.deleteError = null;
      })
      .addCase(
        deleteSessionPattern.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.deleteStatus = "succeeded";
          state.deleteError = null;
          state.patterns = state.patterns.filter(
            (p) => p.recurrence_group_id !== action.payload
          );
        }
      )
      .addCase(deleteSessionPattern.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.deleteError = action.payload as ErrorInfo;
      })

      // Fetch Pattern Sessions
      .addCase(fetchPatternSessions.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchPatternSessions.fulfilled,
        (state, action: PayloadAction<SessionResponse[]>) => {
          state.status = "succeeded";
          state.error = null;
          state.currentPatternSessions = action.payload;
        }
      )
      .addCase(fetchPatternSessions.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as ErrorInfo;
      })

      // Fetch Available Sessions
      .addCase(fetchAvailableSessions.pending, (state) => {
        state.availableSessionsStatus = "loading";
        state.availableSessionsError = null;
      })
      .addCase(
        fetchAvailableSessions.fulfilled,
        (state, action: PayloadAction<SessionResponse[]>) => {
          state.availableSessionsStatus = "succeeded";
          state.availableSessionsError = null;
          state.availableSessions = action.payload;
        }
      )
      .addCase(fetchAvailableSessions.rejected, (state, action) => {
        state.availableSessionsStatus = "failed";
        state.availableSessionsError = action.payload as ErrorInfo;
      })

      // Fetch Available Slots
      .addCase(fetchAvailableSlots.pending, (state) => {
        state.availableSlotsStatus = "loading";
        state.availableSlotsError = null;
      })
      .addCase(
        fetchAvailableSlots.fulfilled,
        (state, action: PayloadAction<SlotResponse[]>) => {
          state.availableSlotsStatus = "succeeded";
          state.availableSlotsError = null;
          state.availableSlots = action.payload;
        }
      )
      .addCase(fetchAvailableSlots.rejected, (state, action) => {
        state.availableSlotsStatus = "failed";
        state.availableSlotsError = action.payload as ErrorInfo;
      })

      // Fetch Doctor Available Slots (NEW APPOINTMENT API)
      .addCase(fetchDoctorAvailableSlots.pending, (state) => {
        state.doctorAvailableSlotsStatus = "loading";
        state.doctorAvailableSlotsError = null;
      })
      .addCase(
        fetchDoctorAvailableSlots.fulfilled,
        (state, action: PayloadAction<SlotResponse[]>) => {
          state.doctorAvailableSlotsStatus = "succeeded";
          state.doctorAvailableSlotsError = null;
          state.doctorAvailableSlots = action.payload;
        }
      )
      .addCase(fetchDoctorAvailableSlots.rejected, (state, action) => {
        state.doctorAvailableSlotsStatus = "failed";
        state.doctorAvailableSlotsError = action.payload as ErrorInfo;
      })

      // Fetch My Available Slots (NEW APPOINTMENT API)
      .addCase(fetchMyAvailableSlots.pending, (state) => {
        state.doctorAvailableSlotsStatus = "loading";
        state.doctorAvailableSlotsError = null;
      })
      .addCase(
        fetchMyAvailableSlots.fulfilled,
        (state, action: PayloadAction<SlotResponse[]>) => {
          state.doctorAvailableSlotsStatus = "succeeded";
          state.doctorAvailableSlotsError = null;
          state.doctorAvailableSlots = action.payload;
        }
      )
      .addCase(fetchMyAvailableSlots.rejected, (state, action) => {
        state.doctorAvailableSlotsStatus = "failed";
        state.doctorAvailableSlotsError = action.payload as ErrorInfo;
      })

      // Block Appointment Slot (NEW APPOINTMENT API)
      .addCase(blockAppointmentSlot.pending, (state) => {
        state.doctorAvailableSlotsStatus = "loading";
      })
      .addCase(
        blockAppointmentSlot.fulfilled,
        (state, action: PayloadAction<SlotResponse>) => {
          state.doctorAvailableSlotsStatus = "succeeded";
          // Update the slot in the doctorAvailableSlots array
          const index = state.doctorAvailableSlots.findIndex(
            slot => slot.id === action.payload.id
          );
          if (index !== -1) {
            state.doctorAvailableSlots[index] = action.payload;
          }
        }
      )
      .addCase(blockAppointmentSlot.rejected, (state, action) => {
        state.doctorAvailableSlotsStatus = "failed";
        state.doctorAvailableSlotsError = action.payload as ErrorInfo;
      })

      // Unblock Appointment Slot (NEW APPOINTMENT API)
      .addCase(unblockAppointmentSlot.pending, (state) => {
        state.doctorAvailableSlotsStatus = "loading";
      })
      .addCase(
        unblockAppointmentSlot.fulfilled,
        (state, action: PayloadAction<SlotResponse>) => {
          state.doctorAvailableSlotsStatus = "succeeded";
          // Update the slot in the doctorAvailableSlots array
          const index = state.doctorAvailableSlots.findIndex(
            slot => slot.id === action.payload.id
          );
          if (index !== -1) {
            state.doctorAvailableSlots[index] = action.payload;
          }
        }
      )
      .addCase(unblockAppointmentSlot.rejected, (state, action) => {
        state.doctorAvailableSlotsStatus = "failed";
        state.doctorAvailableSlotsError = action.payload as ErrorInfo;
      });
  },
});

export const { 
  clearCreateStatus, 
  clearDeleteStatus, 
  clearAvailableSessionsStatus, 
  clearAvailableSlotsStatus,
  clearDoctorAvailableSlotsStatus,
  clearError,
  clearCreateError,
  clearDeleteError,
  clearAvailableSessionsError,
  clearAvailableSlotsError,
  clearDoctorAvailableSlotsError,
  clearAllErrors
} = sessionsSlice.actions;

export default sessionsSlice.reducer;
