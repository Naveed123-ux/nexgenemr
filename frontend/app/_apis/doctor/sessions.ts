import { privateApi } from "@/lib/axios";
import axios from "axios";

// ---- Types ----

export interface SimpleSession {
  name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  session_type: "on_site" | "off_site";
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

export interface AdvancedSession {
  name: string;
  session_type: "on_site" | "off_site";
  start_time_of_day: string;
  end_time_of_day: string;
  recurrence_config: RecurrenceConfig;
}

export interface CreateSessionRequest {
  is_recurring: boolean;
  simple_session?: SimpleSession;
  advanced_session?: AdvancedSession;
}

export interface SessionPattern {
  id: number;
  recurrence_group_id: string;
  name: string;
  session_type: "on_site" | "off_site";
  start_time_of_day: string;
  end_time_of_day: string;
  sessions_generated_count: number;
  is_active: boolean;
  created_at: string;
  is_recurring: boolean;
}

export interface Session {
  id: number;
  doctor_user_id: number;
  name: string;
  start_time: string;
  end_time: string;
  status: "AVAILABLE" | "BOOKED" | "CANCELLED";
  is_recurring: boolean;
  session_type: "on_site" | "off_site";
  recurrence_group_id: string | null;
}

// ---- API Functions ----

/**
 * Create a new session pattern (simple or advanced)
 */
export const createSessionPattern = async (data: CreateSessionRequest): Promise<SessionPattern> => {
  try {
    const response = await privateApi.post<SessionPattern>("/sessions/", data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to create session pattern"
      );
    }
    throw new Error("Failed to create session pattern");
  }
};

/**
 * Fetch all session patterns for the logged-in doctor
 */
export const fetchSessionPatterns = async (): Promise<SessionPattern[]> => {
  try {
    const response = await privateApi.get<SessionPattern[]>("/sessions/patterns");
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch session patterns"
      );
    }
    throw new Error("Failed to fetch session patterns");
  }
};

/**
 * Delete a session pattern by recurrence_group_id
 */
export const deleteSessionPattern = async (recurrenceGroupId: string): Promise<void> => {
  try {
    await privateApi.delete(`/sessions/patterns/${recurrenceGroupId}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to delete session pattern"
      );
    }
    throw new Error("Failed to delete session pattern");
  }
};

/**
 * Fetch sessions for a specific pattern
 */
export const fetchPatternSessions = async (
  recurrenceGroupId: string,
  startDate?: string,
  endDate?: string
): Promise<Session[]> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    const response = await privateApi.get<Session[]>(
      `/sessions/patterns/${recurrenceGroupId}/sessions?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.detail || "Failed to fetch pattern sessions"
      );
    }
    throw new Error("Failed to fetch pattern sessions");
  }
};
