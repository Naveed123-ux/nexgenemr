/**
 * Session API Request Builder
 * Converts form state to API request format for unified session creation
 */

import {
  SessionCreateRequest,
  DayOfWeek,
  SessionType,
  SlotData,
  RecurrenceConfig,
  SessionFormState,
  SlotConfig,
  SessionRequestBuilderOptions,
  RequestBuilderResult,
  RecurrenceDuration,
  WeekPosition,
  ShortDayName,
  SHORT_DAY_NAME_MAP
} from "./session-api-types";

// Re-export types for backward compatibility
export type {
  SessionRequestBuilderOptions as RequestBuilderOptions,
  RequestBuilderResult,
  SessionFormState as SessionFormData,
  SlotConfig
};

// ---- Utility Functions ----

/**
 * Remove undefined, null, and empty values from an object
 */
function cleanObject<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          cleaned[key as keyof T] = value as T[keyof T];
        }
      } else if (typeof value === 'string') {
        if (value.trim() !== '') {
          cleaned[key as keyof T] = value.trim() as T[keyof T];
        }
      } else if (typeof value === 'object') {
        const cleanedNested = cleanObject(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key as keyof T] = cleanedNested as T[keyof T];
        }
      } else {
        cleaned[key as keyof T] = value;
      }
    }
  }

  return cleaned;
}

/**
 * Convert day abbreviation to full day name
 */
function convertDayAbbreviationToFull(dayAbbr: ShortDayName): DayOfWeek {
  return SHORT_DAY_NAME_MAP[dayAbbr] || dayAbbr as DayOfWeek;
}

/**
 * Convert day abbreviations array to full day names
 */
function convertDayAbbreviationsToFull(dayAbbrs: ShortDayName[]): DayOfWeek[] {
  return dayAbbrs.map(convertDayAbbreviationToFull);
}

/**
 * Ensure time is in HH:MM format
 */
function formatTimeString(time: string): string {
  if (!time) return '';

  // If already in HH:MM format, return as is
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time;
  }

  // If in H:MM format, pad with zero
  if (/^\d{1}:\d{2}$/.test(time)) {
    return `0${time}`;
  }

  // If in HH:M format, pad minutes with zero
  if (/^\d{2}:\d{1}$/.test(time)) {
    return `${time}0`;
  }

  // If in H:M format, pad both
  if (/^\d{1}:\d{1}$/.test(time)) {
    const [hours, minutes] = time.split(':');
    return `0${hours}:0${minutes}`;
  }

  return time;
}

/**
 * Convert slot configuration to API slot data format
 */
function convertSlotToApiFormat(slot: SlotConfig): SlotData {
  const slotData: SlotData = {
    start_time: formatTimeString(slot.start_time),
    end_time: formatTimeString(slot.end_time),
    duration: slot.duration,
    slot_type: slot.slot_type
  };

  // Add optional fields only if they have values
  if (slot.title && slot.title.trim()) {
    slotData.title = slot.title.trim();
  }

  if (slot.label && slot.label.trim()) {
    slotData.label = slot.label.trim();
  }

  if (slot.slot_color && slot.slot_color.trim()) {
    slotData.slot_color = slot.slot_color.trim();
  }

  if (slot.modality) {
    slotData.modality = slot.modality;
  }

  if (slot.is_blocked !== undefined) {
    slotData.is_blocked = slot.is_blocked;
  }

  return slotData;
}

/**
 * Build recurrence configuration for advanced patterns
 */
function buildRecurrenceConfig(formData: SessionFormState): RecurrenceConfig {
  const config: any = {
    duration: formData.recurrenceType as RecurrenceDuration,
    start_date: formData.startDate || '',
    end_date: formData.endDate || null,
    selected_option: "on_day",
    selected_days: null,
    month_days: null,
    week: null,
    week_day: null
  };

  switch (formData.recurrenceType) {
    case 'daily':
      config.selected_option = "on_day";
      break;

    case 'weekly':
      config.selected_option = "on_day";
      if (formData.selectedDays && formData.selectedDays.length > 0) {
        config.selected_days = convertDayAbbreviationsToFull(formData.selectedDays);
      }
      break;

    case 'monthly':
      if (formData.monthDays && formData.monthDays.length > 0) {
        config.selected_option = "on_date";
        config.month_days = [...formData.monthDays].sort((a, b) => a - b);
      } else if (formData.week && formData.weekDay) {
        config.selected_option = "on_day";
        config.week = formData.week;
        config.week_day = formData.weekDay ? convertDayAbbreviationToFull(formData.weekDay) : null;
      }
      break;

    default:
      throw new Error(`Unsupported recurrence type: ${formData.recurrenceType}`);
  }

  return config;
}

/**
 * Validate form data has required fields for the selected pattern type
 */
function validateFormDataForPatternType(formData: SessionFormState): string[] {
  const errors: string[] = [];

  if (formData.patternType === 'simple') {
    if (!formData.dayOfWeek) {
      errors.push('Day of week is required for simple patterns');
    }
    if (!formData.durationWeeks || formData.durationWeeks < 1) {
      errors.push('Duration weeks is required for simple patterns');
    }
  } else if (formData.patternType === 'advanced') {
    if (!formData.recurrenceType) {
      errors.push('Recurrence type is required for advanced patterns');
    }
    if (!formData.startDate) {
      errors.push('Start date is required for advanced patterns');
    }

    // Validate specific recurrence type requirements
    if (formData.recurrenceType === 'weekly') {
      if (!formData.selectedDays || formData.selectedDays.length === 0) {
        errors.push('At least one day must be selected for weekly patterns');
      }
    } else if (formData.recurrenceType === 'monthly') {
      const hasMonthDays = formData.monthDays && formData.monthDays.length > 0;
      const hasWeekDay = formData.week && formData.weekDay;

      if (!hasMonthDays && !hasWeekDay) {
        errors.push('Either month days or week/weekday must be specified for monthly patterns');
      }
    }
  }

  return errors;
}

// ---- Main Builder Functions ----

/**
 * Build simple session request (day_of_week + duration_weeks)
 */
export function buildSimpleSessionRequest(
  formData: SessionFormState,
  options: SessionRequestBuilderOptions = {}
): RequestBuilderResult<SessionCreateRequest> {
  try {
    // Validate required fields
    if (options.validateBeforeBuild) {
      const validationErrors = validateFormDataForPatternType(formData);
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: validationErrors
        };
      }
    }

    const request: SessionCreateRequest = {
      name: formData.sessionName.trim(),
      session_type: formData.sessionType,
      start_time: formatTimeString(formData.startTime),
      end_time: formatTimeString(formData.endTime),
      day_of_week: formData.dayOfWeek!,
      duration_weeks: formData.durationWeeks!
    };

    // Add slots if provided
    if (formData.slots && formData.slots.length > 0) {
      request.slots = formData.slots.map(convertSlotToApiFormat);
    }

    // Clean the request object if requested
    const finalRequest = options.excludeEmptyFields ?
      cleanObject(request) as SessionCreateRequest :
      request;

    return {
      success: true,
      request: finalRequest
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to build simple session request: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Build advanced session request (recurrence_config)
 */
export function buildAdvancedSessionRequest(
  formData: SessionFormState,
  options: SessionRequestBuilderOptions = {}
): RequestBuilderResult<SessionCreateRequest> {
  try {
    // Validate required fields
    if (options.validateBeforeBuild) {
      const validationErrors = validateFormDataForPatternType(formData);
      if (validationErrors.length > 0) {
        return {
          success: false,
          errors: validationErrors
        };
      }
    }

    const request: SessionCreateRequest = {
      name: formData.sessionName.trim(),
      session_type: formData.sessionType,
      start_time: formatTimeString(formData.startTime),
      end_time: formatTimeString(formData.endTime),
      recurrence_config: buildRecurrenceConfig(formData)
    };

    // Add slots if provided
    if (formData.slots && formData.slots.length > 0) {
      request.slots = formData.slots.map(convertSlotToApiFormat);
    }

    // Clean the request object if requested
    const finalRequest = options.excludeEmptyFields ?
      cleanObject(request) as SessionCreateRequest :
      request;

    return {
      success: true,
      request: finalRequest
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to build advanced session request: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Main function to build session request based on pattern type
 */
export function buildSessionRequest(
  formData: SessionFormState,
  options: SessionRequestBuilderOptions = { excludeEmptyFields: true, validateBeforeBuild: true }
): RequestBuilderResult<SessionCreateRequest> {
  // Basic validation
  if (!formData.sessionName || !formData.sessionName.trim()) {
    return {
      success: false,
      errors: ['Session name is required']
    };
  }

  if (!formData.sessionType) {
    return {
      success: false,
      errors: ['Session type is required']
    };
  }

  if (!formData.startTime || !formData.endTime) {
    return {
      success: false,
      errors: ['Start time and end time are required']
    };
  }

  if (!formData.patternType) {
    return {
      success: false,
      errors: ['Pattern type is required']
    };
  }

  // Route to appropriate builder based on pattern type
  switch (formData.patternType) {
    case 'simple':
      return buildSimpleSessionRequest(formData, options);

    case 'advanced':
      return buildAdvancedSessionRequest(formData, options);

    default:
      return {
        success: false,
        errors: [`Unsupported pattern type: ${formData.patternType}`]
      };
  }
}

/**
 * Convert current session management wizard form state to SessionFormData
 */
export function convertWizardFormToSessionFormData(wizardForm: {
  sessionName: string;
  sessionType: SessionType;
  startTimeOfDay: string;
  endTimeOfDay: string;
  recurrenceType: RecurrenceDuration;
  startDate: string;
  endDate: string;
  selectedDays: ShortDayName[];
  monthDaysInput: string;
  monthDays: number[];
  week: WeekPosition;
  weekDay: ShortDayName;
  slots: SlotConfig[];
}): SessionFormState {
  return {
    sessionName: wizardForm.sessionName,
    sessionType: wizardForm.sessionType,
    startTime: wizardForm.startTimeOfDay,
    endTime: wizardForm.endTimeOfDay,
    patternType: 'advanced', // Current wizard only supports advanced patterns
    recurrenceType: wizardForm.recurrenceType,
    startDate: wizardForm.startDate,
    endDate: wizardForm.endDate,
    selectedDays: wizardForm.selectedDays,
    monthDays: wizardForm.monthDays,
    week: wizardForm.week,
    weekDay: wizardForm.weekDay,
    slots: wizardForm.slots
  };
}

/**
 * Helper function to create a simple session form data object
 */
export function createSimpleSessionFormData(
  sessionName: string,
  sessionType: SessionType,
  startTime: string,
  endTime: string,
  dayOfWeek: DayOfWeek,
  durationWeeks: number,
  slots?: SlotConfig[]
): SessionFormState {
  return {
    sessionName,
    sessionType,
    startTime,
    endTime,
    patternType: 'simple',
    dayOfWeek,
    durationWeeks,
    slots
  };
}

/**
 * Helper function to create an advanced session form data object
 */
export function createAdvancedSessionFormData(
  sessionName: string,
  sessionType: SessionType,
  startTime: string,
  endTime: string,
  recurrenceType: RecurrenceDuration,
  startDate: string,
  endDate?: string,
  options?: {
    selectedDays?: ShortDayName[];
    monthDays?: number[];
    week?: WeekPosition;
    weekDay?: ShortDayName;
    slots?: SlotConfig[];
  }
): SessionFormState {
  return {
    sessionName,
    sessionType,
    startTime,
    endTime,
    patternType: 'advanced',
    recurrenceType,
    startDate,
    endDate,
    selectedDays: options?.selectedDays,
    monthDays: options?.monthDays,
    week: options?.week,
    weekDay: options?.weekDay,
    slots: options?.slots
  };
}

/**
 * Validate that a request payload is properly formatted for the API
 */
export function validateRequestPayload(request: SessionCreateRequest): string[] {
  const errors: string[] = [];

  // Check required fields
  if (!request.name || !request.name.trim()) {
    errors.push('Session name is required');
  }

  if (!request.session_type) {
    errors.push('Session type is required');
  }

  if (!request.start_time) {
    errors.push('Start time is required');
  } else if (!/^\d{2}:\d{2}$/.test(request.start_time)) {
    errors.push('Start time must be in HH:MM format');
  }

  if (!request.end_time) {
    errors.push('End time is required');
  } else if (!/^\d{2}:\d{2}$/.test(request.end_time)) {
    errors.push('End time must be in HH:MM format');
  }

  // Check pattern mutual exclusivity
  const hasSimplePattern = request.day_of_week || request.duration_weeks;
  const hasAdvancedPattern = request.recurrence_config;

  if (hasSimplePattern && hasAdvancedPattern) {
    errors.push('Cannot have both simple pattern (day_of_week/duration_weeks) and advanced pattern (recurrence_config)');
  }

  if (!hasSimplePattern && !hasAdvancedPattern) {
    errors.push('Must have either simple pattern (day_of_week/duration_weeks) or advanced pattern (recurrence_config)');
  }

  // Validate simple pattern
  if (hasSimplePattern) {
    if (!request.day_of_week) {
      errors.push('day_of_week is required for simple patterns');
    }
    if (!request.duration_weeks || request.duration_weeks < 1) {
      errors.push('duration_weeks is required and must be at least 1 for simple patterns');
    }
  }

  // Validate advanced pattern
  if (hasAdvancedPattern && request.recurrence_config) {
    const config = request.recurrence_config;

    if (!config.duration) {
      errors.push('recurrence_config.duration is required');
    }

    if (!config.start_date) {
      errors.push('recurrence_config.start_date is required');
    }

    if (!config.selected_option) {
      errors.push('recurrence_config.selected_option is required');
    }
  }

  // Validate slots if present
  if (request.slots && request.slots.length > 0) {
    request.slots.forEach((slot, index) => {
      if (!slot.start_time) {
        errors.push(`Slot ${index + 1}: start_time is required`);
      } else if (!/^\d{2}:\d{2}$/.test(slot.start_time)) {
        errors.push(`Slot ${index + 1}: start_time must be in HH:MM format`);
      }

      if (!slot.end_time) {
        errors.push(`Slot ${index + 1}: end_time is required`);
      } else if (!/^\d{2}:\d{2}$/.test(slot.end_time)) {
        errors.push(`Slot ${index + 1}: end_time must be in HH:MM format`);
      }

      if (!slot.slot_type) {
        errors.push(`Slot ${index + 1}: slot_type is required`);
      }

      if (typeof slot.duration !== 'number' || slot.duration <= 0) {
        errors.push(`Slot ${index + 1}: duration must be a positive number`);
      }
    });
  }

  return errors;
}