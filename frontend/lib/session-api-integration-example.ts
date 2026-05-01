/**
 * Example integration of SessionApiService with Redux
 * This file demonstrates how to use the new SessionApiService
 * in place of direct API calls in Redux thunks
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { sessionApiService } from './session-api-service';
import type { SessionCreateRequest, SessionFilters } from '@/store/slices/sessionsSlice';

// Example: Updated createSessionPattern thunk using the service
export const createSessionPatternWithService = createAsyncThunk(
  'sessions/createPatternWithService',
  async (sessionData: SessionCreateRequest, { rejectWithValue }) => {
    try {
      const result = await sessionApiService.createSession(sessionData);
      return result;
    } catch (error: any) {
      return rejectWithValue({
        message: error.userMessage || error.message,
        type: error.type || 'unknown',
        shouldRedirect: error.type === 'authentication'
      });
    }
  }
);

// Example: Fetch available sessions with caching
export const fetchAvailableSessionsWithService = createAsyncThunk(
  'sessions/fetchAvailableWithService',
  async (filters: SessionFilters | undefined, { rejectWithValue }) => {
    try {
      // Use caching by default for better performance
      const result = await sessionApiService.getAvailableSessions(filters, true);
      return result;
    } catch (error: any) {
      return rejectWithValue({
        message: error.userMessage || error.message,
        type: error.type || 'unknown',
        shouldRedirect: error.type === 'authentication'
      });
    }
  }
);

// Example: Fetch pattern sessions with date range and caching
export const fetchPatternSessionsWithService = createAsyncThunk(
  'sessions/fetchPatternSessionsWithService',
  async (
    {
      recurrenceGroupId,
      startDate,
      endDate,
      useCache = true
    }: {
      recurrenceGroupId: string;
      startDate?: string;
      endDate?: string;
      useCache?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const result = await sessionApiService.getPatternSessions(
        recurrenceGroupId,
        startDate,
        endDate,
        useCache
      );
      return result;
    } catch (error: any) {
      return rejectWithValue({
        message: error.userMessage || error.message,
        type: error.type || 'unknown',
        shouldRedirect: error.type === 'authentication'
      });
    }
  }
);

// Example: Advanced available sessions search
export const searchAvailableSessionsAdvanced = createAsyncThunk(
  'sessions/searchAvailableAdvanced',
  async (
    searchOptions: {
      doctorId?: number;
      dateRange?: { start: string; end: string };
      timeRange?: { startTime: string; endTime: string };
      minDuration?: number;
      hasAvailableSlots?: boolean;
    },
    { rejectWithValue }
  ) => {
    try {
      const result = await sessionApiService.getAvailableSessionsAdvanced({
        ...searchOptions,
        useCache: true
      });
      return result;
    } catch (error: any) {
      return rejectWithValue({
        message: error.userMessage || error.message,
        type: error.type || 'unknown',
        shouldRedirect: error.type === 'authentication'
      });
    }
  }
);

// Example: Cache management utilities
export const sessionCacheUtils = {
  /**
   * Clear all session-related cache
   */
  clearAllCache: () => {
    sessionApiService.clearCache();
  },

  /**
   * Clear only available sessions cache
   */
  clearAvailableSessionsCache: () => {
    sessionApiService.clearCacheByPrefix('available-sessions');
  },

  /**
   * Clear only available slots cache
   */
  clearAvailableSlotsCache: () => {
    sessionApiService.clearCacheByPrefix('available-slots');
  },

  /**
   * Clear expired cache entries
   */
  clearExpiredCache: () => {
    sessionApiService.clearExpiredCache();
  },

  /**
   * Get cache statistics
   */
  getCacheStats: () => {
    return sessionApiService.getCacheStats();
  }
};

// Example usage in a React component:
/*
import { useAppDispatch } from '@/hooks/useStore';
import { sessionCacheUtils } from '@/lib/session-api-integration-example';

const MyComponent = () => {
  const dispatch = useAppDispatch();

  const handleCreateSession = async (sessionData: SessionCreateRequest) => {
    try {
      await dispatch(createSessionPatternWithService(sessionData)).unwrap();
      // Session created successfully
    } catch (error) {
      // Handle error
      console.error('Failed to create session:', error);
    }
  };

  const handleRefreshData = () => {
    // Clear cache and refetch
    sessionCacheUtils.clearAvailableSessionsCache();
    dispatch(fetchAvailableSessionsWithService({}));
  };

  // ... rest of component
};
*/