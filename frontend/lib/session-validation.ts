/**
 * Session Creation Form Validation Utilities
 * Handles validation for session name, times, patterns, and slots
 */

import { 
  DayOfWeek, 
  SessionType, 
  SlotType, 
  SlotModality, 
  RecurrenceConfig,
  FieldValidationError,
  ValidationResult,
  SlotConfig,
  SessionFormState,
  RecurrenceDuration,
  WeekPosition,
  ShortDayName
} from "./session-api-types";

// Re-export types for backward compatibility
export type { 
  FieldValidationError as ValidationError,
  ValidationResult,
  SlotConfig,
  SessionFormState as SessionFormData,
  DayOfWeek,
  SessionType,
  SlotType,
  SlotModality,
  RecurrenceConfig,
  RecurrenceDuration,
  WeekPosition,
  ShortDayName
};

// ---- Utility Functions ----

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: string, 
  end1: string, 
  start2: string, 
  end2: string
): boolean {
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);
  
  return start1Min < end2Min && start2Min < end1Min;
}

/**
 * Check if two slots overlap
 */
export function slotsOverlap(slot1: SlotConfig, slot2: SlotConfig): boolean {
  return timeRangesOverlap(
    slot1.start_time,
    slot1.end_time,
    slot2.start_time,
    slot2.end_time
  );
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validate date format (YYYY-MM-DD)
 */
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;
  
  const dateObj = new Date(date);
  return dateObj.toISOString().split('T')[0] === date;
}

// ---- Core Validation Functions ----

/**
 * Validate session name
 */
export function validateSessionName(name: string): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  
  if (!name || !name.trim()) {
    errors.push({
      field: 'sessionName',
      message: 'Session name is required'
    });
  } else if (name.trim().length < 3) {
    errors.push({
      field: 'sessionName',
      message: 'Session name must be at least 3 characters long'
    });
  } else if (name.trim().length > 100) {
    errors.push({
      field: 'sessionName',
      message: 'Session name must be less than 100 characters'
    });
  }
  
  return errors;
}

/**
 * Validate session times
 */
export function validateSessionTimes(startTime: string, endTime: string): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  
  if (!startTime) {
    errors.push({
      field: 'startTime',
      message: 'Start time is required'
    });
  } else if (!isValidTimeFormat(startTime)) {
    errors.push({
      field: 'startTime',
      message: 'Start time must be in HH:MM format'
    });
  }
  
  if (!endTime) {
    errors.push({
      field: 'endTime',
      message: 'End time is required'
    });
  } else if (!isValidTimeFormat(endTime)) {
    errors.push({
      field: 'endTime',
      message: 'End time must be in HH:MM format'
    });
  }
  
  // Only validate time relationship if both times are valid
  if (isValidTimeFormat(startTime) && isValidTimeFormat(endTime)) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    if (startMinutes >= endMinutes) {
      errors.push({
        field: 'timeRange',
        message: 'Start time must be before end time'
      });
    }

    // Minimum session duration of 15 minutes
    if (endMinutes - startMinutes < 15) {
      errors.push({
        field: 'timeRange',
        message: 'Session must be at least 15 minutes long'
      });
    }
    
    // Maximum session duration of 12 hours
    if (endMinutes - startMinutes > 720) {
      errors.push({
        field: 'timeRange',
        message: 'Session cannot be longer than 12 hours'
      });
    }
  }
  
  return errors;
}

/**
 * Validate simple pattern fields
 */
export function validateSimplePattern(
  dayOfWeek?: DayOfWeek,
  durationWeeks?: number
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  
  if (!dayOfWeek) {
    errors.push({
      field: 'dayOfWeek',
      message: 'Day of week is required for simple patterns'
    });
  }
  
  if (durationWeeks === undefined || durationWeeks === null) {
    errors.push({
      field: 'durationWeeks',
      message: 'Duration in weeks is required for simple patterns'
    });
  } else if (durationWeeks < 1) {
    errors.push({
      field: 'durationWeeks',
      message: 'Duration must be at least 1 week'
    });
  } else if (durationWeeks > 52) {
    errors.push({
      field: 'durationWeeks',
      message: 'Duration cannot exceed 52 weeks'
    });
  }
  
  return errors;
}

/**
 * Validate advanced pattern fields
 */
export function validateAdvancedPattern(
  recurrenceType?: RecurrenceDuration,
  startDate?: string,
  endDate?: string,
  selectedDays?: ShortDayName[],
  monthDays?: number[],
  week?: WeekPosition,
  weekDay?: ShortDayName
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  
  if (!recurrenceType) {
    errors.push({
      field: 'recurrenceType',
      message: 'Recurrence type is required for advanced patterns'
    });
  }
  
  if (!startDate) {
    errors.push({
      field: 'startDate',
      message: 'Start date is required for advanced patterns'
    });
  } else if (!isValidDateFormat(startDate)) {
    errors.push({
      field: 'startDate',
      message: 'Start date must be in YYYY-MM-DD format'
    });
  } else {
    const today = new Date().toISOString().split('T')[0];
    if (startDate < today) {
      errors.push({
        field: 'startDate',
        message: 'Start date cannot be in the past'
      });
    }
  }
  
  if (endDate && !isValidDateFormat(endDate)) {
    errors.push({
      field: 'endDate',
      message: 'End date must be in YYYY-MM-DD format'
    });
  }
  
  if (startDate && endDate && isValidDateFormat(startDate) && isValidDateFormat(endDate)) {
    if (endDate <= startDate) {
      errors.push({
        field: 'endDate',
        message: 'End date must be after start date'
      });
    }
  }
  
  // Specific validations per recurrence type
  if (recurrenceType === 'weekly') {
    if (!selectedDays || selectedDays.length === 0) {
      errors.push({
        field: 'selectedDays',
        message: 'At least one day must be selected for weekly patterns'
      });
    } else if (selectedDays.length > 7) {
      errors.push({
        field: 'selectedDays',
        message: 'Cannot select more than 7 days'
      });
    }
  }
  
  if (recurrenceType === 'monthly') {
    if (!monthDays || monthDays.length === 0) {
      errors.push({
        field: 'monthDays',
        message: 'At least one day of month must be specified for monthly date patterns'
      });
    } else {
      const invalidDays = monthDays.filter(day => day < 1 || day > 31);
      if (invalidDays.length > 0) {
        errors.push({
          field: 'monthDays',
          message: 'Month days must be between 1 and 31'
        });
      }
    }
  }
  
  // Note: monthly-weekday is handled as part of monthly with week/weekDay fields

  
  return errors;
}

/**
 * Validate pattern mutual exclusivity
 */
export function validatePatternMutualExclusivity(formData: SessionFormState): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  
  const hasSimpleFields = formData.dayOfWeek || formData.durationWeeks;
  const hasAdvancedFields = formData.recurrenceType || formData.startDate || 
                           formData.selectedDays?.length || formData.monthDays?.length ||
                           formData.week || formData.weekDay;
  
  if (formData.patternType === 'simple' && hasAdvancedFields) {
    errors.push({
      field: 'patternType',
      message: 'Simple pattern cannot have advanced pattern fields. Please clear advanced fields or switch to advanced pattern type.'
    });
  }
  
  if (formData.patternType === 'advanced' && hasSimpleFields) {
    errors.push({
      field: 'patternType',
      message: 'Advanced pattern cannot have simple pattern fields. Please clear simple fields or switch to simple pattern type.'
    });
  }
  
  return errors;
}

/**
 * Validate individual slot
 */
export function validateSlot(
  slot: SlotConfig,
  sessionStartTime: string,
  sessionEndTime: string
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  
  // Basic field validation
  if (!slot.title || !slot.title.trim()) {
    errors.push({
      field: `slot_${slot.id}_title`,
      message: 'Slot title is required'
    });
  }
  
  if (!slot.start_time) {
    errors.push({
      field: `slot_${slot.id}_start_time`,
      message: 'Slot start time is required'
    });
  } else if (!isValidTimeFormat(slot.start_time)) {
    errors.push({
      field: `slot_${slot.id}_start_time`,
      message: 'Slot start time must be in HH:MM format'
    });
  }
  
  if (!slot.end_time) {
    errors.push({
      field: `slot_${slot.id}_end_time`,
      message: 'Slot end time is required'
    });
  } else if (!isValidTimeFormat(slot.end_time)) {
    errors.push({
      field: `slot_${slot.id}_end_time`,
      message: 'Slot end time must be in HH:MM format'
    });
  }
  
  if (!slot.slot_type) {
    errors.push({
      field: `slot_${slot.id}_slot_type`,
      message: 'Slot type is required'
    });
  }
  
  // Time range validation
  if (isValidTimeFormat(slot.start_time) && isValidTimeFormat(slot.end_time)) {
    const slotStartMin = timeToMinutes(slot.start_time);
    const slotEndMin = timeToMinutes(slot.end_time);
    
    if (slotStartMin >= slotEndMin) {
      errors.push({
        field: `slot_${slot.id}_time_range`,
        message: 'Slot start time must be before end time'
      });
    }
    
    // Minimum slot duration of 5 minutes
    if (slotEndMin - slotStartMin < 5) {
      errors.push({
        field: `slot_${slot.id}_duration`,
        message: 'Slot must be at least 5 minutes long'
      });
    }
    
    // Validate slot falls within session time range
    if (isValidTimeFormat(sessionStartTime) && isValidTimeFormat(sessionEndTime)) {
      const sessionStartMin = timeToMinutes(sessionStartTime);
      const sessionEndMin = timeToMinutes(sessionEndTime);
      
      if (slotStartMin < sessionStartMin) {
        errors.push({
          field: `slot_${slot.id}_start_time`,
          message: 'Slot start time cannot be before session start time'
        });
      }
      
      if (slotEndMin > sessionEndMin) {
        errors.push({
          field: `slot_${slot.id}_end_time`,
          message: 'Slot end time cannot be after session end time'
        });
      }
    }
    
    // Validate duration matches calculated duration
    const calculatedDuration = slotEndMin - slotStartMin;
    if (slot.duration && Math.abs(slot.duration - calculatedDuration) > 1) {
      errors.push({
        field: `slot_${slot.id}_duration`,
        message: 'Slot duration does not match start and end times'
      });
    }
  }
  
  // Modality validation for clinical slots
  if (slot.slot_type === 'clinical' && !slot.modality) {
    errors.push({
      field: `slot_${slot.id}_modality`,
      message: 'Modality is required for clinical slots'
    });
  }
  
  return errors;
}

/**
 * Validate slot overlaps
 */
export function validateSlotOverlaps(slots: SlotConfig[]): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const slot1 = slots[i];
      const slot2 = slots[j];
      
      if (slotsOverlap(slot1, slot2)) {
        errors.push({
          field: `slot_overlap_${slot1.id}_${slot2.id}`,
          message: `Slot "${slot1.title}" overlaps with slot "${slot2.title}"`
        });
      }
    }
  }
  
  return errors;
}

/**
 * Validate all slots
 */
export function validateSlots(
  slots: SlotConfig[],
  sessionStartTime: string,
  sessionEndTime: string
): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  
  // Validate individual slots
  slots.forEach(slot => {
    errors.push(...validateSlot(slot, sessionStartTime, sessionEndTime));
  });
  
  // Validate slot overlaps
  errors.push(...validateSlotOverlaps(slots));
  
  return errors;
}

/**
 * Main validation function for complete session form
 */
export function validateSessionForm(formData: SessionFormState): ValidationResult {
  const errors: FieldValidationError[] = [];
  
  // Basic validation
  errors.push(...validateSessionName(formData.sessionName));
  errors.push(...validateSessionTimes(formData.startTime, formData.endTime));
  
  // Pattern validation
  errors.push(...validatePatternMutualExclusivity(formData));
  
  if (formData.patternType === 'simple') {
    errors.push(...validateSimplePattern(formData.dayOfWeek, formData.durationWeeks));
  } else if (formData.patternType === 'advanced') {
    errors.push(...validateAdvancedPattern(
      formData.recurrenceType,
      formData.startDate,
      formData.endDate,
      formData.selectedDays,
      formData.monthDays,
      formData.week,
      formData.weekDay
    ));
  }
  
  // Slot validation
  if (formData.slots && formData.slots.length > 0) {
    errors.push(...validateSlots(formData.slots, formData.startTime, formData.endTime));
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format validation errors for user display
 */
export function formatValidationErrors(errors: FieldValidationError[]): string {
  if (errors.length === 0) return '';
  
  if (errors.length === 1) {
    return errors[0].message;
  }
  
  return `Please fix the following issues:\n${errors.map(error => `• ${error.message}`).join('\n')}`;
}

/**
 * Get errors for a specific field
 */
export function getFieldErrors(errors: FieldValidationError[], fieldName: string): FieldValidationError[] {
  return errors.filter(error => error.field === fieldName || error.field.startsWith(`${fieldName}_`));
}

/**
 * Check if a specific field has errors
 */
export function hasFieldError(errors: FieldValidationError[], fieldName: string): boolean {
  return getFieldErrors(errors, fieldName).length > 0;
}

/**
 * Get the first error message for a specific field
 */
export function getFieldErrorMessage(errors: FieldValidationError[], fieldName: string): string | undefined {
  const fieldErrors = getFieldErrors(errors, fieldName);
  return fieldErrors.length > 0 ? fieldErrors[0].message : undefined;
}

/**
 * Real-time field validation - validates individual fields as user types
 */
export function validateField(fieldName: string, value: any, formData: SessionFormState): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  
  switch (fieldName) {
    case 'sessionName':
      errors.push(...validateSessionName(value));
      break;
      
    case 'startTime':
      if (value && formData.endTime) {
        errors.push(...validateSessionTimes(value, formData.endTime));
      } else if (value) {
        if (!isValidTimeFormat(value)) {
          errors.push({
            field: 'startTime',
            message: 'Start time must be in HH:MM format'
          });
        }
      }
      break;
      
    case 'endTime':
      if (value && formData.startTime) {
        errors.push(...validateSessionTimes(formData.startTime, value));
      } else if (value) {
        if (!isValidTimeFormat(value)) {
          errors.push({
            field: 'endTime',
            message: 'End time must be in HH:MM format'
          });
        }
      }
      break;
      
    case 'dayOfWeek':
      if (formData.patternType === 'simple') {
        errors.push(...validateSimplePattern(value, formData.durationWeeks));
      }
      break;
      
    case 'durationWeeks':
      if (formData.patternType === 'simple') {
        errors.push(...validateSimplePattern(formData.dayOfWeek, value));
      }
      break;
      
    case 'startDate':
      if (formData.patternType === 'advanced') {
        errors.push(...validateAdvancedPattern(
          formData.recurrenceType,
          value,
          formData.endDate,
          formData.selectedDays,
          formData.monthDays,
          formData.week,
          formData.weekDay
        ));
      }
      break;
      
    case 'endDate':
      if (formData.patternType === 'advanced') {
        errors.push(...validateAdvancedPattern(
          formData.recurrenceType,
          formData.startDate,
          value,
          formData.selectedDays,
          formData.monthDays,
          formData.week,
          formData.weekDay
        ));
      }
      break;
      
    case 'selectedDays':
      if (formData.patternType === 'advanced' && formData.recurrenceType === 'weekly') {
        errors.push(...validateAdvancedPattern(
          formData.recurrenceType,
          formData.startDate,
          formData.endDate,
          value,
          formData.monthDays,
          formData.week,
          formData.weekDay
        ));
      }
      break;
      
    case 'monthDays':
      if (formData.patternType === 'advanced' && formData.recurrenceType === 'monthly') {
        errors.push(...validateAdvancedPattern(
          formData.recurrenceType,
          formData.startDate,
          formData.endDate,
          formData.selectedDays,
          value,
          formData.week,
          formData.weekDay
        ));
      }
      break;
  }
  
  return errors;
}

/**
 * Cross-field validation - validates relationships between fields
 */
export function validateCrossFields(formData: SessionFormState): FieldValidationError[] {
  const errors: FieldValidationError[] = [];
  
  // Time range validation
  if (formData.startTime && formData.endTime) {
    errors.push(...validateSessionTimes(formData.startTime, formData.endTime));
  }
  
  // Pattern mutual exclusivity
  errors.push(...validatePatternMutualExclusivity(formData));
  
  // Date range validation for advanced patterns
  if (formData.patternType === 'advanced' && formData.startDate && formData.endDate) {
    if (isValidDateFormat(formData.startDate) && isValidDateFormat(formData.endDate)) {
      if (formData.endDate <= formData.startDate) {
        errors.push({
          field: 'endDate',
          message: 'End date must be after start date'
        });
      }
    }
  }
  
  return errors;
}