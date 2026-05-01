/**
 * Waitlist API Client
 * 
 * Centralized API functions for interacting with the waitlist system.
 * Import and use these functions throughout your frontend application.
 * 
 * @example
 * import { waitlistApi } from "@/lib/waitlist-api";
 * 
 * // Create a waitlist entry
 * const entry = await waitlistApi.createEntry({
 *   patient_profile_id: 1,
 *   doctor_user_id: 2,
 *   priority: "high",
 *   preferred_days: ["Mon", "Wed", "Fri"]
 * });
 */

import { privateApi } from "@/lib/axios";
import axios from "axios";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type WaitlistPriority = "normal" | "high";
export type WaitlistStatus = "pending" | "invited" | "booked" | "cancelled" | "expired";

export interface WaitlistEntry {
  id: number;
  patient_profile_id: number;
  doctor_user_id: number;
  priority: WaitlistPriority;
  preferred_days: string[];
  notes: string | null;
  status: WaitlistStatus;
  expiry_date: string;
  created_at: string;
  created_by_user_id: number;
  updated_at: string;
  updated_by_user_id: number | null;
  invited_at: string | null;
  invitation_expires_at: string | null;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
  doctor?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface WaitlistSummary {
  doctor_user_id: number;
  total_pending: number;
  high_priority_count: number;
  by_day: {
    Mon: number;
    Tue: number;
    Wed: number;
    Thu: number;
    Fri: number;
    Sat: number;
    Sun: number;
    Anytime: number;
  };
}

export interface TriageMatch {
  entry_id: number;
  patient_name: string;
  patient_phone: string | null;
  priority: string;
  notes: string | null;
  created_at: string;
  days_waiting: number;
  preferred_days: string[];
}

export interface TriageMatchResponse {
  slot_id: number;
  slot_start_time: string;
  slot_end_time: string;
  doctor_name: string;
  doctor_user_id: number;
  match_count: number;
  matches: TriageMatch[];
}

export interface InvitationResponse {
  token: string;
  expires_at: string;
  invitation_sent: boolean;
  entry_id: number;
  slot_id: number;
}

export interface BookingDetailsResponse {
  valid: boolean;
  slot_available: boolean;
  patient_name?: string;
  doctor_name?: string;
  appointment_time?: string;
  appointment_end_time?: string;
  is_telehealth?: boolean;
  hospital_name?: string;
  error_message?: string;
}

export interface MetricsTimeToBooking {
  average_days: number;
  total_booked_entries: number;
  high_priority_average_days: number;
  normal_priority_average_days: number;
  high_priority_count: number;
  normal_priority_count: number;
}

export interface MetricsInvitationAcceptance {
  acceptance_rate: number;
  total_invitations_sent: number;
  total_accepted: number;
  total_expired: number;
  total_cancelled: number;
}

export interface MetricsSlotFillRate {
  fill_rate: number;
  total_entries: number;
  total_booked: number;
  total_pending: number;
  total_expired: number;
  total_cancelled: number;
  total_invited: number;
}

export interface MetricsDemandTrends {
  start_date: string;
  end_date: string;
  days: number;
  daily_counts: {
    [date: string]: {
      total: number;
      high_priority: number;
      normal_priority: number;
    };
  };
  total_entries: number;
}

export interface ComprehensiveMetrics {
  time_to_booking: MetricsTimeToBooking;
  invitation_acceptance: MetricsInvitationAcceptance;
  slot_fill_rate: MetricsSlotFillRate;
  demand_trends: MetricsDemandTrends;
}

// ============================================================================
// WAITLIST MANAGEMENT API
// ============================================================================

/**
 * Create a new waitlist entry for a patient
 */
export const createEntry = async (data: {
  patient_profile_id: number;
  doctor_user_id: number;
  priority: WaitlistPriority;
  preferred_days: string[];
  notes?: string;
  expiry_date?: string; // YYYY-MM-DD format, defaults to +30 days
}): Promise<WaitlistEntry> => {
  const response = await privateApi.post("/api/waitlist/entries", data);
  return response.data;
};

/**
 * Get all waitlist entries for a specific doctor
 */
export const getEntriesForDoctor = async (
  doctorId: number,
  statusFilter?: WaitlistStatus
): Promise<WaitlistEntry[]> => {
  const params = statusFilter ? `?status_filter=${statusFilter}` : "";
  const response = await privateApi.get(
    `/api/waitlist/doctors/${doctorId}/entries${params}`
  );
  return response.data;
};

/**
 * Get all waitlist entries for a specific patient
 */
export const getEntriesForPatient = async (
  patientId: number,
  statusFilter?: WaitlistStatus
): Promise<WaitlistEntry[]> => {
  const params = statusFilter ? `?status_filter=${statusFilter}` : "";
  const response = await privateApi.get(
    `/api/waitlist/patients/${patientId}/entries${params}`
  );
  return response.data;
};

/**
 * Get waitlist summary (aggregate data) for a doctor
 */
export const getSummaryForDoctor = async (
  doctorId: number
): Promise<WaitlistSummary> => {
  const response = await privateApi.get(
    `/api/waitlist/doctors/${doctorId}/summary`
  );
  return response.data;
};

/**
 * Update an existing waitlist entry
 */
export const updateEntry = async (
  entryId: number,
  data: {
    priority?: WaitlistPriority;
    preferred_days?: string[];
    notes?: string;
    expiry_date?: string;
  }
): Promise<WaitlistEntry> => {
  const response = await privateApi.patch(
    `/api/waitlist/entries/${entryId}`,
    data
  );
  return response.data;
};

/**
 * Remove a waitlist entry (sets status to CANCELLED)
 */
export const removeEntry = async (
  entryId: number
): Promise<{ detail: string; entry_id: number }> => {
  const response = await privateApi.delete(`/api/waitlist/entries/${entryId}`);
  return response.data;
};

// ============================================================================
// TRIAGE API
// ============================================================================

/**
 * Get matching waitlist entries for a specific appointment slot
 */
export const getSlotMatches = async (
  slotId: number
): Promise<TriageMatchResponse> => {
  const response = await privateApi.get(`/api/waitlist/slots/${slotId}/matches`);
  return response.data;
};

/**
 * Send an invitation to a waitlist patient for a specific slot
 */
export const sendInvitation = async (
  entryId: number,
  slotId: number
): Promise<InvitationResponse> => {
  const response = await privateApi.post(
    `/api/waitlist/entries/${entryId}/invite`,
    { appointment_slot_id: slotId }
  );
  return response.data;
};

/**
 * Manually book a patient from waitlist (staff calls and books directly)
 */
export const manualBookFromWaitlist = async (
  entryId: number,
  data: {
    appointment_slot_id: number;
    is_telehealth: boolean;
    reason_for_visit: string;
  }
): Promise<any> => {
  const response = await privateApi.post(
    `/api/waitlist/entries/${entryId}/book`,
    data
  );
  return response.data;
};

// ============================================================================
// PATIENT BOOKING API (PUBLIC - NO AUTH)
// ============================================================================

/**
 * Validate token and get booking details (PUBLIC - no auth required)
 */
export const getBookingDetails = async (
  token: string
): Promise<BookingDetailsResponse> => {
  const response = await axios.get(`/api/waitlist/book/${token}`);
  return response.data;
};

/**
 * Claim an appointment using a booking token (PUBLIC - no auth required)
 */
export const claimAppointment = async (
  token: string,
  reasonForVisit?: string
): Promise<any> => {
  const response = await axios.post(`/api/waitlist/book/${token}/claim`, {
    reason_for_visit: reasonForVisit,
  });
  return response.data;
};

// ============================================================================
// METRICS API
// ============================================================================

/**
 * Get average time from waitlist to booking metrics
 */
export const getTimeToBookingMetrics = async (
  doctorId?: number,
  startDate?: string,
  endDate?: string
): Promise<MetricsTimeToBooking> => {
  const params = new URLSearchParams();
  if (doctorId) params.append("doctor_id", doctorId.toString());
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const response = await privateApi.get(
    `/api/waitlist/metrics/time-to-booking?${params}`
  );
  return response.data;
};

/**
 * Get invitation acceptance rate metrics
 */
export const getInvitationAcceptanceMetrics = async (
  doctorId?: number,
  startDate?: string,
  endDate?: string
): Promise<MetricsInvitationAcceptance> => {
  const params = new URLSearchParams();
  if (doctorId) params.append("doctor_id", doctorId.toString());
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const response = await privateApi.get(
    `/api/waitlist/metrics/invitation-acceptance?${params}`
  );
  return response.data;
};

/**
 * Get slot fill rate from waitlist metrics
 */
export const getSlotFillRateMetrics = async (
  doctorId?: number,
  startDate?: string,
  endDate?: string
): Promise<MetricsSlotFillRate> => {
  const params = new URLSearchParams();
  if (doctorId) params.append("doctor_id", doctorId.toString());
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const response = await privateApi.get(
    `/api/waitlist/metrics/slot-fill-rate?${params}`
  );
  return response.data;
};

/**
 * Get waitlist demand trends over time
 */
export const getDemandTrendsMetrics = async (
  doctorId?: number,
  days: number = 30
): Promise<MetricsDemandTrends> => {
  const params = new URLSearchParams();
  if (doctorId) params.append("doctor_id", doctorId.toString());
  params.append("days", days.toString());

  const response = await privateApi.get(
    `/api/waitlist/metrics/demand-trends?${params}`
  );
  return response.data;
};

/**
 * Get comprehensive metrics (all metrics in one call)
 */
export const getComprehensiveMetrics = async (
  doctorId?: number,
  startDate?: string,
  endDate?: string
): Promise<ComprehensiveMetrics> => {
  const params = new URLSearchParams();
  if (doctorId) params.append("doctor_id", doctorId.toString());
  if (startDate) params.append("start_date", startDate);
  if (endDate) params.append("end_date", endDate);

  const response = await privateApi.get(
    `/api/waitlist/metrics/comprehensive?${params}`
  );
  return response.data;
};

// ============================================================================
// EXPORT ALL AS NAMESPACE
// ============================================================================

export const waitlistApi = {
  // Management
  createEntry,
  getEntriesForDoctor,
  getEntriesForPatient,
  getSummaryForDoctor,
  updateEntry,
  removeEntry,

  // Triage
  getSlotMatches,
  sendInvitation,
  manualBookFromWaitlist,

  // Patient Booking (Public)
  getBookingDetails,
  claimAppointment,

  // Metrics
  getTimeToBookingMetrics,
  getInvitationAcceptanceMetrics,
  getSlotFillRateMetrics,
  getDemandTrendsMetrics,
  getComprehensiveMetrics,
};

export default waitlistApi;
