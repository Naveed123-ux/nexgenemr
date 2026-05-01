/**
 * Demonstration of Session Validation and Request Builder utilities
 * This file shows how to use the unified session creation request builder
 */

import {
  validateSessionForm,
  formatValidationErrors,
  SessionFormData
} from './session-validation';

import {
  buildSessionRequest,
  createSimpleSessionFormData,
  createAdvancedSessionFormData
} from './session-request-builder';

// Example 1: Simple weekly session
export function createSimpleWeeklySession() {
  const formData = createSimpleSessionFormData(
    'Weekly Clinic Hours',
    'on_site',
    '09:00',
    '17:00',
    'Monday',
    12 // 12 weeks
  );

  // Validate the form data
  const validation = validateSessionForm(formData);
  if (!validation.isValid) {
    console.error('Validation failed:', formatValidationErrors(validation.errors));
    return null;
  }

  // Build the API request
  const requestResult = buildSessionRequest(formData);
  if (!requestResult.success) {
    console.error('Request building failed:', requestResult.errors);
    return null;
  }

  return requestResult.request;
}

// Example 2: Advanced weekly session with slots
export function createAdvancedWeeklySessionWithSlots() {
  const formData = createAdvancedSessionFormData(
    'Multi-day Clinic',
    'on_site',
    '09:00',
    '17:00',
    'weekly',
    '2024-01-01',
    '2024-12-31',
    {
      selectedDays: ['Mon', 'Wed', 'Fri'],
      slots: [
        {
          id: 'slot-1',
          start_time: '09:00',
          end_time: '09:30',
          duration: 30,
          title: 'Morning Consultation',
          slot_type: 'clinical',
          modality: 'face_to_face',
          is_blocked: false
        },
        {
          id: 'slot-2',
          start_time: '10:00',
          end_time: '10:15',
          duration: 15,
          title: 'Break',
          slot_type: 'break',
          is_blocked: true
        }
      ]
    }
  );

  // Validate the form data
  const validation = validateSessionForm(formData);
  if (!validation.isValid) {
    console.error('Validation failed:', formatValidationErrors(validation.errors));
    return null;
  }

  // Build the API request
  const requestResult = buildSessionRequest(formData);
  if (!requestResult.success) {
    console.error('Request building failed:', requestResult.errors);
    return null;
  }

  return requestResult.request;
}

// Example 3: Monthly session on specific dates
export function createMonthlySessionOnDates() {
  const formData = createAdvancedSessionFormData(
    'Monthly Review Sessions',
    'off_site',
    '14:00',
    '16:00',
    'monthly',
    '2024-01-01',
    undefined,
    {
      monthDays: [1, 15] // 1st and 15th of each month
    }
  );

  // Validate and build request
  const validation = validateSessionForm(formData);
  if (!validation.isValid) {
    return { error: formatValidationErrors(validation.errors) };
  }

  const requestResult = buildSessionRequest(formData);
  if (!requestResult.success) {
    return { error: requestResult.errors?.join(', ') };
  }

  return { request: requestResult.request };
}

// Example 4: Validation error handling
export function demonstrateValidationErrors() {
  const invalidFormData: SessionFormData = {
    sessionName: '', // Invalid: empty name
    sessionType: 'on_site',
    startTime: '17:00', // Invalid: start after end
    endTime: '09:00',
    patternType: 'simple',
    dayOfWeek: 'Monday',
    durationWeeks: 0, // Invalid: must be at least 1
    slots: [
      {
        id: 'slot-1',
        start_time: '18:00', // Invalid: outside session time
        end_time: '18:30',
        duration: 30,
        title: 'Late Slot',
        slot_type: 'clinical',
        is_blocked: false
      }
    ]
  };

  const validation = validateSessionForm(invalidFormData);

  return {
    isValid: validation.isValid,
    errors: validation.errors,
    formattedErrors: formatValidationErrors(validation.errors)
  };
}

// Usage examples (commented out to avoid execution)
/*
console.log('Simple Session Request:', createSimpleWeeklySession());
console.log('Advanced Session Request:', createAdvancedWeeklySessionWithSlots());
console.log('Monthly Session Request:', createMonthlySessionOnDates());
console.log('Validation Errors Demo:', demonstrateValidationErrors());
*/