// ❌ DEPRECATED: This file has been replaced by sessionsSlice.ts
// ✅ Use sessionsSlice.ts instead - API routes have changed from /slots/ to /sessions/
// This file is kept for reference only and should not be imported

// Unified Slot System Redux Slice (DEPRECATED)
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { privateApi } from "@/lib/axios";

// ---- Types ----

// Simple Weekly Slot
export interface SimpleSlot {
  name: string;
  day_of_week: string; // Full name: "Monday", "Tuesday", etc.
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  slot_type: "on_site" | "off_site";
  duration_weeks: number; // 1-52
}

// Advanced Recurring Pattern
export interface RecurrenceConfig {
  duration: "daily" | "weekly" | "monthly";
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD or null
  selected_option: "on_day" | "on_date";
  selected_days: string[] | null; // ["Mon", "Wed", "Fri"] - for weekly
  month_days: number[] | null; // [1, 15] - for monthly on specific dates
  week: "first" | "second" | "third" | "fourth" | "last" | null; // for monthly on week/day
  week_day: string | null; // "Mon", "Tue", etc. - for monthly on week/day
}

export interface AdvancedSlot {
  name: string;
  slot_type: "on_site" | "off_site";
  start_time_of_day: string; // HH:MM format
  end_time_of_day: string; // HH:MM format
  recurrence_config: RecurrenceConfig;
}

// Slot Creation Request
export interface CreateSlotRequest {
  is_recurring: boolean;
  simple_slot?: SimpleSlot;
  advanced_slot?: AdvancedSlot;
}

// Slot Pattern Response
export interface SlotPattern {
  id: number;
  recurrence_group_id: string;
  name: string;
  slot_type: "on_site" | "off_site";
  start_time_of_day: string;
  end_time_of_day: string;
  slots_generated_count: number;
  is_active: boolean;
  created_at: string;
  is_recurring: boolean;
}

// Individual Slot
export interface Slot {
  id: number;
  doctor_user_id: number;
  name: string;
  start_time: string;
  end_time: string;
  status: "AVAILABLE" | "BOOKED" | "CANCELLED";
  is_recurring: boolean;
  slot_type: "on_site" | "off_site";
  recurrence_group_id: string | null;
}

// ---- State ----
interface SlotsState {
  patterns: SlotPattern[];
  currentPatternSlots: Slot[];
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  createStatus: "idle" | "loading" | "succeeded" | "failed";
  deleteStatus: "idle" | "loading" | "succeeded" | "failed";
}

const initialState: SlotsState = {
  patterns: [],
  currentPatternSlots: [],
  status: "idle",
  error: null,
  createStatus: "idle",
  deleteStatus: "idle",
};

// ---- Async Thunks ----

/**
 * Create a new slot pattern (simple or advanced)
 */
export const createSlotPattern = createAsyncThunk(
  "slots/createPattern",
  async (slotData: CreateSlotRequest, { rejectWithValue }) => {
    try {
      const response = await privateApi.post<SlotPattern>("/slots/", slotData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to create slot pattern."
      );
    }
  }
);

/**
 * Fetch all slot patterns for the logged-in doctor
 */
export const fetchSlotPatterns = createAsyncThunk(
  "slots/fetchPatterns",
  async (_, { rejectWithValue }) => {
    try {
      const response = await privateApi.get<SlotPattern[]>("/slots/patterns");
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to fetch slot patterns."
      );
    }
  }
);

/**
 * Delete a slot pattern by recurrence_group_id
 */
export const deleteSlotPattern = createAsyncThunk(
  "slots/deletePattern",
  async (recurrenceGroupId: string, { rejectWithValue }) => {
    try {
      await privateApi.delete(`/slots/patterns/${recurrenceGroupId}`);
      return recurrenceGroupId;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to delete slot pattern."
      );
    }
  }
);

/**
 * Fetch slots for a specific pattern
 */
export const fetchPatternSlots = createAsyncThunk(
  "slots/fetchPatternSlots",
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

      const response = await privateApi.get<Slot[]>(
        `/slots/patterns/${recurrenceGroupId}/slots?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.detail || "Failed to fetch pattern slots."
      );
    }
  }
);

// ---- Slice Definition ----
const slotsSlice = createSlice({
  name: "slots",
  initialState,
  reducers: {
    clearCreateStatus: (state) => {
      state.createStatus = "idle";
      state.error = null;
    },
    clearDeleteStatus: (state) => {
      state.deleteStatus = "idle";
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Slot Pattern
      .addCase(createSlotPattern.pending, (state) => {
        state.createStatus = "loading";
        state.error = null;
      })
      .addCase(
        createSlotPattern.fulfilled,
        (state, action: PayloadAction<SlotPattern>) => {
          state.createStatus = "succeeded";
          state.patterns.unshift(action.payload); // Add to beginning
        }
      )
      .addCase(createSlotPattern.rejected, (state, action) => {
        state.createStatus = "failed";
        state.error = action.payload as string;
      })

      // Fetch Slot Patterns
      .addCase(fetchSlotPatterns.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchSlotPatterns.fulfilled,
        (state, action: PayloadAction<SlotPattern[]>) => {
          state.status = "succeeded";
          state.patterns = action.payload;
        }
      )
      .addCase(fetchSlotPatterns.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      })

      // Delete Slot Pattern
      .addCase(deleteSlotPattern.pending, (state) => {
        state.deleteStatus = "loading";
        state.error = null;
      })
      .addCase(
        deleteSlotPattern.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.deleteStatus = "succeeded";
          state.patterns = state.patterns.filter(
            (p) => p.recurrence_group_id !== action.payload
          );
        }
      )
      .addCase(deleteSlotPattern.rejected, (state, action) => {
        state.deleteStatus = "failed";
        state.error = action.payload as string;
      })

      // Fetch Pattern Slots
      .addCase(fetchPatternSlots.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(
        fetchPatternSlots.fulfilled,
        (state, action: PayloadAction<Slot[]>) => {
          state.status = "succeeded";
          state.currentPatternSlots = action.payload;
        }
      )
      .addCase(fetchPatternSlots.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload as string;
      });
  },
});

export const { clearCreateStatus, clearDeleteStatus } = slotsSlice.actions;
export default slotsSlice.reducer;
