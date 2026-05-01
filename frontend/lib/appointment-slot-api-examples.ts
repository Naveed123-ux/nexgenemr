/**
 * Appointment Slot API Examples
 * 
 * This file demonstrates how to use the new slot-based appointment API
 * for fetching available slots, blocking/unblocking slots, and booking appointments.
 * 
 * Migration from session-based to slot-based API
 */

import { sessionApiService } from './session-api-service';
// import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchDoctorAvailableSlots,
  fetchMyAvailableSlots,
  blockAppointmentSlot,
  unblockAppointmentSlot
} from '@/store/slices/sessionsSlice';
import type { SlotResponse } from './session-api-types';
import type { AppDispatch, RootState } from '@/store/store';

// ========================================
// Example 1: Fetch Available Slots for a Doctor
// ========================================

/**
 * Fetch available slots for a specific doctor using Redux
 */
export const useDoctorAvailableSlots = () => {
  // const dispatch = useAppDispatch();
  // const { doctorAvailableSlots, doctorAvailableSlotsStatus, doctorAvailableSlotsError } = 
  //   useAppSelector(state => state.sessions);
  
  // Placeholder for demonstration - replace with actual hooks in your components
  const dispatch = null as any as AppDispatch;
  type ApiStatus = 'idle' | 'loading' | 'succeeded' | 'failed';
  const { doctorAvailableSlots, doctorAvailableSlotsStatus, doctorAvailableSlotsError } = {
    doctorAvailableSlots: [] as SlotResponse[],
    doctorAvailableSlotsStatus: 'idle' as ApiStatus,
    doctorAvailableSlotsError: null
  };

  const fetchSlots = async (doctorId: number, startDate?: string) => {
    await dispatch(fetchDoctorAvailableSlots({
      doctorId,
      startDate,
      onlyAvailable: true // Filter out blocked/booked slots
    }));
  };

  return {
    slots: doctorAvailableSlots,
    status: doctorAvailableSlotsStatus,
    error: doctorAvailableSlotsError,
    fetchSlots
  };
};

/**
 * Fetch available slots using the API service directly
 */
export const fetchDoctorSlotsDirectly = async (doctorId: number, startDate: string) => {
  try {
    const slots = await sessionApiService.getAvailableSlotsForDoctor(
      doctorId,
      startDate,
      {
        onlyAvailable: true,
        slotType: 'clinical', // Optional: filter by slot type
        modality: 'face_to_face' // Optional: filter by modality
      }
    );
    
    console.log(`Found ${slots.length} available slots`);
    return slots;
  } catch (error) {
    console.error('Failed to fetch slots:', error);
    throw error;
  }
};

// ========================================
// Example 2: Fetch My Available Slots (Logged-in Doctor)
// ========================================

/**
 * Fetch available slots for the logged-in doctor using Redux
 */
export const useMyAvailableSlots = () => {
  // const dispatch = useAppDispatch();
  // const { doctorAvailableSlots, doctorAvailableSlotsStatus, doctorAvailableSlotsError } = 
  //   useAppSelector(state => state.sessions);
  
  // Placeholder for demonstration - replace with actual hooks in your components
  const dispatch = null as any as AppDispatch;
  const { doctorAvailableSlots, doctorAvailableSlotsStatus, doctorAvailableSlotsError } = {
    doctorAvailableSlots: [] as SlotResponse[],
    doctorAvailableSlotsStatus: 'idle' as const,
    doctorAvailableSlotsError: null
  };

  const fetchMySlots = async (startDate?: string, endDate?: string) => {
    await dispatch(fetchMyAvailableSlots({
      startDate,
      endDate,
      onlyAvailable: true
    }));
  };

  return {
    slots: doctorAvailableSlots,
    status: doctorAvailableSlotsStatus,
    error: doctorAvailableSlotsError,
    fetchMySlots
  };
};

/**
 * Fetch my available slots using the API service directly
 */
export const fetchMySlotsDirectly = async (startDate?: string) => {
  try {
    const slots = await sessionApiService.getMyAvailableSlots(startDate, {
      onlyAvailable: true
    });
    
    return slots;
  } catch (error) {
    console.error('Failed to fetch my slots:', error);
    throw error;
  }
};

// ========================================
// Example 3: Display Slots in UI Component
// ========================================

/**
 * Example React component showing how to display available slots
 */
export const SlotListExample = () => {
  // This is a TypeScript example, not actual JSX
  const { slots, status, fetchSlots } = useDoctorAvailableSlots();
  
  // Type assertion for status comparison
  type ApiStatus = 'idle' | 'loading' | 'succeeded' | 'failed';

  // Fetch slots on component mount
  // useEffect(() => {
  //   fetchSlots(123, '2025-10-27');
  // }, []);

  // Group slots by session if needed
  const slotsBySession = slots.reduce((acc: Record<number, SlotResponse[]>, slot: SlotResponse) => {
    if (!acc[slot.session_id]) {
      acc[slot.session_id] = [];
    }
    acc[slot.session_id].push(slot);
    return acc;
  }, {} as Record<number, SlotResponse[]>);

  // Filter slots by type
  const clinicalSlots = slots.filter((slot: SlotResponse) => slot.slot_type === 'clinical');
  const faceToFaceSlots = slots.filter((slot: SlotResponse) => slot.modality === 'face_to_face');

  return {
    allSlots: slots,
    slotsBySession,
    clinicalSlots,
    faceToFaceSlots,
    isLoading: status === 'loading'
  };
};

// ========================================
// Example 4: Block/Unblock Slots
// ========================================

/**
 * Block a slot using Redux
 */
export const useBlockSlot = () => {
  // const dispatch = useAppDispatch();
  const dispatch = null as any as AppDispatch;

  const blockSlot = async (slotId: number) => {
    const result = await dispatch(blockAppointmentSlot(slotId));
    
    if (blockAppointmentSlot.fulfilled.match(result)) {
      const updatedSlot = result.payload;
      console.log('Slot blocked:', updatedSlot);
      return updatedSlot;
    } else {
      console.error('Failed to block slot');
      throw new Error('Failed to block slot');
    }
  };

  return { blockSlot };
};

/**
 * Unblock a slot using Redux
 */
export const useUnblockSlot = () => {
  // const dispatch = useAppDispatch();
  const dispatch = null as any as AppDispatch;

  const unblockSlot = async (slotId: number) => {
    const result = await dispatch(unblockAppointmentSlot(slotId));
    
    if (unblockAppointmentSlot.fulfilled.match(result)) {
      const updatedSlot = result.payload;
      console.log('Slot unblocked:', updatedSlot);
      return updatedSlot;
    } else {
      console.error('Failed to unblock slot');
      throw new Error('Failed to unblock slot');
    }
  };

  return { unblockSlot };
};

/**
 * Block/Unblock slots using API service directly
 */
export const blockSlotDirectly = async (slotId: number) => {
  try {
    const updatedSlot = await sessionApiService.blockSlot(slotId);
    console.log('Slot blocked:', updatedSlot);
    return updatedSlot;
  } catch (error) {
    console.error('Failed to block slot:', error);
    throw error;
  }
};

export const unblockSlotDirectly = async (slotId: number) => {
  try {
    const updatedSlot = await sessionApiService.unblockSlot(slotId);
    console.log('Slot unblocked:', updatedSlot);
    return updatedSlot;
  } catch (error) {
    console.error('Failed to unblock slot:', error);
    throw error;
  }
};

// ========================================
// Example 5: Booking an Appointment with Slot ID
// ========================================

/**
 * Book an appointment using slot ID (not session ID)
 * NOTE: This assumes you have an appointment booking endpoint
 */
export const bookAppointmentWithSlot = async (
  slotId: number,
  patientUserId: number,
  reasonForVisit: string
) => {
  try {
    // This is the NEW way - using appointment_slot_id
    const response = await fetch('/api/appointments/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_user_id: patientUserId,
        appointment_slot_id: slotId, // Changed from appointment_session_id
        is_telehealth: false,
        reason_for_visit: reasonForVisit
      })
    });

    if (!response.ok) {
      throw new Error('Failed to book appointment');
    }

    const appointment = await response.json();
    console.log('Appointment booked:', appointment);
    return appointment;
  } catch (error) {
    console.error('Failed to book appointment:', error);
    throw error;
  }
};

// ========================================
// Example 6: Advanced Filtering and Sorting
// ========================================

/**
 * Filter and sort slots for display
 */
export const filterAndSortSlots = (slots: SlotResponse[]) => {
  // Filter: Only clinical, face-to-face, available slots
  const filtered = slots.filter(slot => 
    slot.slot_type === 'clinical' &&
    slot.modality === 'face_to_face' &&
    !slot.is_blocked &&
    !slot.is_booked
  );

  // Sort by start time
  const sorted = [...filtered].sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  return sorted;
};

/**
 * Group slots by date
 */
export const groupSlotsByDate = (slots: SlotResponse[]) => {
  return slots.reduce((acc, slot) => {
    const date = new Date(slot.start_time).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(slot);
    return acc;
  }, {} as Record<string, SlotResponse[]>);
};

/**
 * Get slot statistics
 */
export const getSlotStatistics = (slots: SlotResponse[]) => {
  return {
    total: slots.length,
    available: slots.filter(s => !s.is_blocked && !s.is_booked).length,
    blocked: slots.filter(s => s.is_blocked).length,
    booked: slots.filter(s => s.is_booked).length,
    clinical: slots.filter(s => s.slot_type === 'clinical').length,
    faceToFace: slots.filter(s => s.modality === 'face_to_face').length,
    telephone: slots.filter(s => s.modality === 'telephone').length,
    homeVisit: slots.filter(s => s.modality === 'home_visit').length
  };
};

// ========================================
// Example 7: Migration Helper Functions
// ========================================

/**
 * Helper to check if using new slot-based API
 */
export const isSlotBasedResponse = (data: any): data is SlotResponse => {
  return (
    typeof data === 'object' &&
    'id' in data &&
    'session_id' in data &&
    'is_blocked' in data &&
    'is_booked' in data
  );
};

/**
 * Helper to format slot time for display
 */
export const formatSlotTime = (slot: SlotResponse) => {
  const start = new Date(slot.start_time);
  const end = new Date(slot.end_time);
  
  return {
    date: start.toLocaleDateString(),
    startTime: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    endTime: end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    duration: `${slot.duration} min`
  };
};

/**
 * Helper to get slot display label
 */
export const getSlotDisplayLabel = (slot: SlotResponse) => {
  const parts = [];
  
  if (slot.title) parts.push(slot.title);
  if (slot.label) parts.push(slot.label);
  if (slot.modality) {
    const modalityLabel = slot.modality.replace('_', ' ');
    parts.push(modalityLabel);
  }
  
  return parts.join(' - ') || 'Available Slot';
};
