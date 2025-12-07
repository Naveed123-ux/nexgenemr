// ❌ DEPRECATED: This file has been replaced by sessions.ts
// ✅ Use sessions.ts instead - API routes have changed from /slots/ to /sessions/
// This file is kept for reference only and should not be imported

import { privateApi } from "@/lib/axios";
import axios from "axios";

// ---- Types ---- (DEPRECATED)

export interface SimpleSlot {
  name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_type: "on_site" | "off_site";
  duration_weeks: number;
}

export interface RecurrenceConfig {
  duration: "daily" | "weekly" | "monthly";
  start_date: string;
  end_date: string | null;
  selected_option: "on_day" | "on_date";
  selected_days: string[] | null; // ["Mon", "Wed", "Fri"] - for weekly
  month_days: number[] | null; // [1, 15] - for monthly on specific dates
  week: "first" | "second" | "third" | "fourth" | "last" | null; // for monthly on week/day
  week_day: string | null; // "Mon", "Tue", etc. - for monthly on week/day
}

export interface AdvancedSlot {
  name: string;
  slot_type: "on_site" | "off_site";
  start_time_of_day: string;
  end_time_of_day: string;
  recurrence_config: RecurrenceConfig;
}

export interface CreateSlotRequest {
  is_recurring: boolean;
  simple_slot?: SimpleSlot;
  advanced_slot?: AdvancedSlot;
}

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

// ---- API Functions ----

/**
 * Create a new slot pattern (simple or advanced)
 */
export const createSlotPattern = async (data: CreateSlotRequest): Promise<SlotPattern> => {
  try {
    const response = await privateApi.post<SlotPattern>("/slots/", data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to create slot pattern"
      );
    }
    throw new Error("Failed to create slot pattern");
  }
};

/**
 * Fetch all slot patterns for the logged-in doctor
 */
export const fetchSlotPatterns = async (): Promise<SlotPattern[]> => {
  try {
    const response = await privateApi.get<SlotPattern[]>("/slots/patterns");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch slot patterns"
      );
    }
    throw new Error("Failed to fetch slot patterns");
  }
};

/**
 * Delete a slot pattern by recurrence_group_id
 */
export const deleteSlotPattern = async (recurrenceGroupId: string): Promise<void> => {
  try {
    await privateApi.delete(`/slots/patterns/${recurrenceGroupId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to delete slot pattern"
      );
    }
    throw new Error("Failed to delete slot pattern");
  }
};

/**
 * Fetch slots for a specific pattern
 */
export const fetchPatternSlots = async (
  recurrenceGroupId: string,
  startDate?: string,
  endDate?: string
): Promise<Slot[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    const response = await privateApi.get<Slot[]>(
      `/slots/patterns/${recurrenceGroupId}/slots?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch pattern slots"
      );
    }
    throw new Error("Failed to fetch pattern slots");
  }
};
