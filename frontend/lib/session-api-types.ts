/**
 * Comprehensive TypeScript interfaces for Session Management API
 * 
 * This file contains all API request/response interfaces, union types,
 * and comprehensive type definitions that match the exact API structure.
 * 
 * Requirements covered: 7.5, 5.1, 5.2
 */

// ---- Core Union Types ----

/** Session types supported by the API */
export type SessionType = 'on_site' | 'off_site';

/** Day of week for simple patterns - full names as required by API */
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

/** Short day names for UI display and advanced patterns */
export type ShortDayName = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

/** Slot types supported by the API */
export type SlotType = 'clinical' | 'clinicalAdmin' | 'break' | 'unallocated';

/** Modalities for clinical slots */
export type SlotModality = 'face_to_face' | 'home_visit' | 'telephone';

/** Recurrence duration types for advanced patterns */
export type RecurrenceDuration = 'daily' | 'weekly' | 'monthly';

/** Week position for monthly patterns */
export type WeekPosition = 'first' | 'second' | 'third' | 'fourth' | 'last';

/** Pattern type selection */
export type PatternType = 'simple' | 'advanced';

/** Session status values */
export type SessionStatus = 'scheduled' | 'active' | 'completed' | 'cancelled' | 'no_show';

/** API operation status */
export type ApiStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

// ---- Recurrence Configuration Interfaces ----

/** Base recurrence configuration interface */
export interface BaseRecurrenceConfig {
  duration: RecurrenceDuration;
  start_date: string; // YYYY-MM-DD format
  end_date: string | null; // YYYY-MM-DD format or null for indefinite
}

/** Daily recurrence configuration */
export interface DailyRecurrenceConfig extends BaseRecurrenceConfig {
  duration: 'daily';
  selected_option: 'on_day';
  selected_days: null;
  month_days: null;
  week: null;
  week_day: null;
}

/** Weekly recurrence configuration */
export interface WeeklyRecurrenceConfig extends BaseRecurrenceConfig {
  duration: 'weekly';
  selected_option: 'on_day';
  selected_days: ShortDayName[]; // ["Mon", "Wed", "Fri"]
  month_days: null;
  week: null;
  week_day: null;
}

/** Monthly date-based recurrence configuration */
export interface MonthlyDateRecurrenceConfig extends BaseRecurrenceConfig {
  duration: 'monthly';
  selected_option: 'on_date';
  selected_days: null;
  month_days: number[]; // [1, 15, 30]
  week: null;
  week_day: null;
}

/** Monthly weekday-based recurrence configuration */
export interface MonthlyWeekdayRecurrenceConfig extends BaseRecurrenceConfig {
  duration: 'monthly';
  selected_option: 'on_day';
  selected_days: null;
  month_days: null;
  week: WeekPosition; // "first", "second", etc.
  week_day: ShortDayName; // "Mon", "Tue", etc.
}

/** Union type for all recurrence configurations */
export type RecurrenceConfig = 
  | DailyRecurrenceConfig 
  | WeeklyRecurrenceConfig 
  | MonthlyDateRecurrenceConfig 
  | MonthlyWeekdayRecurrenceConfig;

// ---- Slot Data Interfaces ----

/** Slot data for API requests (nested slot creation) */
export interface SlotData {
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  duration: number; // Duration in minutes
  title?: string; // Optional slot title
  label?: string; // Optional custom label
  slot_color?: string; // Optional hex color code
  slot_type: SlotType; // Required slot type
  modality?: SlotModality; // Required for clinical slots, optional for others
  is_blocked?: boolean; // Optional, defaults to false
}

/** Slot response from API (includes server-generated fields) */
export interface SlotResponse {
  id: number; // Server-generated slot ID
  session_id: number; // Parent session ID
  start_time: string; // ISO datetime string
  end_time: string; // ISO datetime string
  duration: number; // Duration in minutes
  title: string | null; // Slot title
  label: string | null; // Custom label
  slot_color: string | null; // Hex color code
  slot_type: SlotType; // Slot type
  modality: SlotModality | null; // Modality (for clinical slots)
  is_blocked: boolean; // Whether slot is blocked
  is_booked: boolean; // Whether slot is booked by a patient
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  waitlist_match_count?: number; // Number of matching waitlist patients
  has_high_priority_matches?: boolean; // Whether any matches are high priority
}

/** Appointment slot filters for available slots endpoint */
export interface AppointmentSlotFilters {
  doctorId?: number; // Filter by doctor ID
  startDate?: string; // Start date filter (YYYY-MM-DD)
  endDate?: string; // End date filter (YYYY-MM-DD)
  slotType?: SlotType; // Filter by slot type
  modality?: SlotModality; // Filter by modality
  onlyAvailable?: boolean; // Only show unblocked and unbooked slots
}

/** Block/Unblock slot response */
export interface BlockSlotResponse extends SlotResponse {
  // Returns the updated slot object after blocking/unblocking
}

// ---- Session Request Interfaces ----

/** Base session creation request */
export interface BaseSessionCreateRequest {
  name: string; // Session name (required)
  session_type: SessionType; // Session type (required)
  start_time: string; // HH:MM format (required)
  end_time: string; // HH:MM format (required)
  slots?: SlotData[]; // Optional nested slots
}

/** Simple weekly session creation request */
export interface SimpleSessionCreateRequest extends BaseSessionCreateRequest {
  // Simple pattern fields (mutually exclusive with recurrence_config)
  day_of_week: DayOfWeek; // Full day name
  duration_weeks: number; // Number of weeks (1-52)
  
  // Advanced pattern fields must be undefined
  recurrence_config?: never;
}

/** Advanced recurring session creation request */
export interface AdvancedSessionCreateRequest extends BaseSessionCreateRequest {
  // Advanced pattern fields (mutually exclusive with simple fields)
  recurrence_config: RecurrenceConfig; // Recurrence configuration
  
  // Simple pattern fields must be undefined
  day_of_week?: never;
  duration_weeks?: never;
}

/** Union type for session creation requests */
export type SessionCreateRequest = SimpleSessionCreateRequest | AdvancedSessionCreateRequest;

/** Session update request (partial fields allowed) */
export interface SessionUpdateRequest {
  name?: string;
  session_type?: SessionType;
  start_time?: string; // HH:MM format
  end_time?: string; // HH:MM format
  day_of_week?: DayOfWeek;
  duration_weeks?: number;
  recurrence_config?: RecurrenceConfig;
  slots?: SlotData[];
}

// ---- Session Response Interfaces ----

/** Session pattern response from API */
export interface SessionPatternResponse {
  id: number; // Pattern ID
  recurrence_group_id: string; // Unique group identifier
  name: string; // Session name
  session_type: SessionType; // Session type
  start_time_of_day: string; // HH:MM format
  end_time_of_day: string; // HH:MM format
  recurrence_config: RecurrenceConfig; // Recurrence configuration
  is_active: boolean; // Whether pattern is active
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  sessions_generated_count?: number; // Number of sessions generated (optional)
  doctor_user_id: number; // Doctor who owns this pattern
}

/** Individual session response from API */
export interface SessionResponse {
  id: number; // Session ID
  doctor_user_id: number; // Doctor who owns this session
  name: string; // Session name
  session_type: SessionType; // Session type
  start_time: string; // ISO datetime string
  end_time: string; // ISO datetime string
  status: SessionStatus; // Session status
  is_recurring: boolean; // Whether session is part of a pattern
  recurrence_group_id?: string; // Group ID if recurring
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  slots?: SlotResponse[]; // Associated slots (if included)
}

/** Paginated session response */
export interface PaginatedSessionResponse {
  sessions: SessionResponse[];
  total_count: number;
  has_more: boolean;
  page: number;
  page_size: number;
}

// ---- Filter and Query Interfaces ----

/** Session filters for available sessions endpoint */
export interface SessionFilters {
  doctorId?: number; // Filter by doctor ID
  sessionType?: SessionType; // Filter by session type
  startDate?: string; // Start date filter (YYYY-MM-DD)
  endDate?: string; // End date filter (YYYY-MM-DD)
}

/** Advanced session filters with additional options */
export interface AdvancedSessionFilters extends SessionFilters {
  timeRange?: {
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
  };
  minDuration?: number; // Minimum session duration in minutes
  maxDuration?: number; // Maximum session duration in minutes
  hasAvailableSlots?: boolean; // Only sessions with available slots
  status?: SessionStatus[]; // Filter by session status
  isRecurring?: boolean; // Filter recurring vs one-time sessions
}

/** Pagination options */
export interface PaginationOptions {
  page?: number; // Page number (1-based)
  pageSize?: number; // Items per page
  sortBy?: 'start_time' | 'created_at' | 'name'; // Sort field
  sortOrder?: 'asc' | 'desc'; // Sort direction
}

/** Query options for pattern sessions */
export interface PatternSessionsQuery {
  recurrenceGroupId: string; // Pattern group ID
  startDate?: string; // Filter start date (YYYY-MM-DD)
  endDate?: string; // Filter end date (YYYY-MM-DD)
  includeSlots?: boolean; // Include slot data
  status?: SessionStatus[]; // Filter by status
}

// ---- Error Response Interfaces ----

/** API error response structure */
export interface ApiErrorResponse {
  detail: string; // Error message
  error_code?: string; // Optional error code
  field_errors?: Record<string, string[]>; // Field-specific validation errors
  timestamp: string; // ISO datetime string
}

/** Validation error for specific field */
export interface FieldValidationError {
  field: string; // Field name
  message: string; // Error message
  code?: string; // Optional error code
}

/** Comprehensive validation result */
export interface ValidationResult {
  isValid: boolean; // Whether validation passed
  errors: FieldValidationError[]; // List of validation errors
  warnings?: FieldValidationError[]; // Optional warnings
}

// ---- API Service Response Types ----

/** Generic API response wrapper */
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  timestamp: string;
}

/** API operation result */
export interface ApiOperationResult<T> {
  success: boolean;
  data?: T;
  error?: ApiErrorResponse;
  statusCode?: number;
}

// ---- Cache and Performance Types ----

/** Cache entry for API responses */
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/** Cache configuration options */
export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  useCache?: boolean; // Whether to use caching
  forceRefresh?: boolean; // Force cache refresh
}

// ---- Request Builder Types ----

/** Session request builder options */
export interface SessionRequestBuilderOptions {
  excludeEmptyFields?: boolean; // Remove undefined/null values
  validateBeforeBuild?: boolean; // Validate before building request
  includeSlots?: boolean; // Include slots in request
  formatTimes?: boolean; // Format times to HH:MM
}

/** Request builder result */
export interface RequestBuilderResult<T> {
  success: boolean;
  request?: T;
  errors?: string[];
  warnings?: string[];
}

// ---- Form State Types ----

/** Form state for session creation wizard */
export interface SessionFormState {
  // Basic session info
  sessionName: string;
  sessionType: SessionType;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  
  // Pattern type selection
  patternType: PatternType;
  
  // Simple pattern fields
  dayOfWeek?: DayOfWeek;
  durationWeeks?: number;
  
  // Advanced pattern fields
  recurrenceType?: RecurrenceDuration;
  startDate?: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format
  selectedDays?: ShortDayName[];
  monthDays?: number[];
  week?: WeekPosition;
  weekDay?: ShortDayName;
  
  // Slot configuration
  slots?: SlotConfig[];
}

/** Slot configuration for form state */
export interface SlotConfig {
  id?: string; // Temporary ID for form management
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  duration: number; // Duration in minutes
  title: string; // Slot title
  label?: string; // Optional custom label
  slot_color?: string; // Optional hex color
  slot_type: SlotType; // Slot type
  modality?: SlotModality; // Modality (required for clinical)
  is_blocked: boolean; // Whether slot is blocked
}

// ---- Component Prop Types ----

/** Props for session management wizard component */
export interface SessionManagementWizardProps {
  initialTab?: 'create' | 'manage';
  onSessionCreated?: (session: SessionPatternResponse) => void;
  onSessionDeleted?: (recurrenceGroupId: string) => void;
  onError?: (error: ApiErrorResponse) => void;
}

/** Props for day scheduler component */
export interface DaySchedulerProps {
  sessionName: string;
  sessionType: SessionType;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  slots: SlotConfig[];
  onSlotClick?: (slot: SlotConfig) => void;
  onSlotRemove?: (slotId: string) => void;
  onTimeSlotClick?: (time: string) => void;
  onSlotEdit?: (slot: SlotConfig) => void;
  readOnly?: boolean;
  showConflicts?: boolean;
  enableInteraction?: boolean;
}

/** Props for add slot dialog component */
export interface AddSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (slot: SlotConfig) => void;
  sessionStartTime?: string; // HH:MM format
  sessionEndTime?: string; // HH:MM format
  existingSlots?: SlotConfig[];
  editingSlot?: SlotConfig | null;
  quickSlotTime?: string; // HH:MM format
  allowedSlotTypes?: SlotType[];
  defaultSlotType?: SlotType;
}

// ---- Redux State Types ----

/** Error information for Redux state */
export interface ErrorInfo {
  message: string;
  type: 'validation' | 'authentication' | 'server' | 'network';
  shouldRedirect?: boolean;
  timestamp?: string;
}

/** Sessions slice state */
export interface SessionsState {
  // Data
  patterns: SessionPatternResponse[];
  currentPatternSessions: SessionResponse[];
  availableSessions: SessionResponse[];
  availableSlots: SlotResponse[];
  doctorAvailableSlots: SlotResponse[]; // Slots from appointment API
  
  // Status tracking
  status: ApiStatus;
  createStatus: ApiStatus;
  deleteStatus: ApiStatus;
  availableSessionsStatus: ApiStatus;
  availableSlotsStatus: ApiStatus;
  doctorAvailableSlotsStatus: ApiStatus;
  
  // Error tracking
  error: ErrorInfo | null;
  createError: ErrorInfo | null;
  deleteError: ErrorInfo | null;
  availableSessionsError: ErrorInfo | null;
  availableSlotsError: ErrorInfo | null;
  doctorAvailableSlotsError: ErrorInfo | null;
  
  // Cache metadata
  lastFetch?: string; // ISO datetime string
  cacheExpiry?: string; // ISO datetime string
}

// ---- Utility Types ----

/** Time range validation */
export interface TimeRange {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  durationMinutes: number;
}

/** Date range validation */
export interface DateRange {
  startDate: string; // YYYY-MM-DD format
  endDate?: string; // YYYY-MM-DD format (optional)
  isValid: boolean;
}

/** Slot overlap detection result */
export interface SlotOverlapResult {
  hasOverlap: boolean;
  overlappingSlots: Array<{
    slot1: SlotConfig;
    slot2: SlotConfig;
    overlapMinutes: number;
  }>;
}

/** Session statistics */
export interface SessionStatistics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  totalSlots: number;
  bookedSlots: number;
  availableSlots: number;
  utilizationRate: number; // Percentage
}

// ---- Type Guards ----

/** Type guard for simple session request */
export function isSimpleSessionRequest(
  request: SessionCreateRequest
): request is SimpleSessionCreateRequest {
  return 'day_of_week' in request && 'duration_weeks' in request;
}

/** Type guard for advanced session request */
export function isAdvancedSessionRequest(
  request: SessionCreateRequest
): request is AdvancedSessionCreateRequest {
  return 'recurrence_config' in request;
}

/** Type guard for daily recurrence config */
export function isDailyRecurrence(
  config: RecurrenceConfig
): config is DailyRecurrenceConfig {
  return config.duration === 'daily';
}

/** Type guard for weekly recurrence config */
export function isWeeklyRecurrence(
  config: RecurrenceConfig
): config is WeeklyRecurrenceConfig {
  return config.duration === 'weekly';
}

/** Type guard for monthly date recurrence config */
export function isMonthlyDateRecurrence(
  config: RecurrenceConfig
): config is MonthlyDateRecurrenceConfig {
  return config.duration === 'monthly' && config.selected_option === 'on_date';
}

/** Type guard for monthly weekday recurrence config */
export function isMonthlyWeekdayRecurrence(
  config: RecurrenceConfig
): config is MonthlyWeekdayRecurrenceConfig {
  return config.duration === 'monthly' && config.selected_option === 'on_day';
}

// ---- Legacy Interfaces (for backward compatibility) ----

/** Legacy simple session interface */
export interface SimpleSession {
  name: string;
  day_of_week: string; // Full name: "Monday", "Tuesday", etc.
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  session_type: "on_site" | "off_site";
  duration_weeks: number; // 1-52
}

/** Legacy advanced session interface */
export interface AdvancedSession {
  name: string;
  session_type: "on_site" | "off_site";
  start_time_of_day: string; // HH:MM format
  end_time_of_day: string; // HH:MM format
  recurrence_config: RecurrenceConfig;
}

/** Legacy session creation request interface */
export interface CreateSessionRequest {
  is_recurring: boolean;
  simple_session?: SimpleSession;
  advanced_session?: AdvancedSession;
}

// ---- Constants ----

/** All supported day names */
export const DAY_NAMES: readonly DayOfWeek[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
] as const;

/** All supported short day names */
export const SHORT_DAY_NAMES: readonly ShortDayName[] = [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
] as const;

/** All supported slot types */
export const SLOT_TYPES: readonly SlotType[] = [
  'clinical', 'clinicalAdmin', 'break', 'unallocated'
] as const;

/** All supported modalities */
export const SLOT_MODALITIES: readonly SlotModality[] = [
  'face_to_face', 'home_visit', 'telephone'
] as const;

/** All supported session types */
export const SESSION_TYPES: readonly SessionType[] = [
  'on_site', 'off_site'
] as const;

/** All supported recurrence durations */
export const RECURRENCE_DURATIONS: readonly RecurrenceDuration[] = [
  'daily', 'weekly', 'monthly'
] as const;

/** All supported week positions */
export const WEEK_POSITIONS: readonly WeekPosition[] = [
  'first', 'second', 'third', 'fourth', 'last'
] as const;

/** Mapping from short day names to full names */
export const SHORT_DAY_NAME_MAP: Record<ShortDayName, DayOfWeek> = {
  'Mon': 'Monday',
  'Tue': 'Tuesday',
  'Wed': 'Wednesday',
  'Thu': 'Thursday',
  'Fri': 'Friday',
  'Sat': 'Saturday',
  'Sun': 'Sunday'
} as const;

/** Mapping from full day names to short names */
export const DAY_NAME_MAP: Record<DayOfWeek, ShortDayName> = {
  'Monday': 'Mon',
  'Tuesday': 'Tue',
  'Wednesday': 'Wed',
  'Thursday': 'Thu',
  'Friday': 'Fri',
  'Saturday': 'Sat',
  'Sunday': 'Sun'
} as const;