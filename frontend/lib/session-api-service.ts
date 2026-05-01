import { privateApi } from './axios';
import { handleApiError, withRetry } from './error-handling';
import type {
    SessionCreateRequest,
    SessionPatternResponse,
    SessionResponse,
    SlotResponse,
    SessionFilters,
    SlotData,
    SessionType,
    CacheEntry,
    CacheOptions,
    AdvancedSessionFilters,
    PaginationOptions,
    PaginatedSessionResponse,
    AppointmentSlotFilters,
    BlockSlotResponse
} from './session-api-types';

/**
 * Custom error classes for API service
 */
export abstract class ApiError extends Error {
    abstract readonly type: string;
    abstract readonly userMessage: string;
}

export class ValidationError extends ApiError {
    readonly type = 'validation';
    readonly userMessage: string;

    constructor(message: string) {
        super(message);
        this.userMessage = message;
    }
}

export class AuthenticationError extends ApiError {
    readonly type = 'authentication';
    readonly userMessage = 'Please log in to continue';
}

export class ServerError extends ApiError {
    readonly type = 'server';
    readonly userMessage = 'Server error occurred. Please try again later.';
}

export class NetworkError extends ApiError {
    readonly type = 'network';
    readonly userMessage = 'Network error. Please check your connection and try again.';
}

// Cache entry interface is now imported from session-api-types

/**
 * Session API Service Class
 * Provides methods for all session-related API endpoints with proper typing,
 * authentication handling, error management, and response caching.
 */
export class SessionApiService {
    private readonly baseUrl: string;
    private readonly retryConfig = {
        maxRetries: 2,
        delayMs: 1000,
    };

    // Response cache for frequently accessed data
    private cache = new Map<string, CacheEntry<any>>();
    private readonly defaultCacheTTL = 5 * 60 * 1000; // 5 minutes default TTL
    private readonly availableSessionsCacheTTL = 2 * 60 * 1000; // 2 minutes for available sessions
    private readonly availableSlotsCacheTTL = 1 * 60 * 1000; // 1 minute for available slots

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    }

    /**
     * Create a new session pattern
     * @param sessionData - Session creation request data
     * @returns Promise<SessionPatternResponse>
     */
    async createSession(sessionData: SessionCreateRequest): Promise<SessionPatternResponse> {
        try {
            const response = await withRetry(
                () => privateApi.post<SessionPatternResponse>('/sessions/', sessionData),
                this.retryConfig
            );

            // Clear relevant cache entries since new sessions affect availability
            this.clearCacheByPrefix('available-sessions');
            this.clearCacheByPrefix('pattern-sessions');

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get all session patterns for the authenticated doctor
     * @returns Promise<SessionPatternResponse[]>
     */
    async getPatterns(): Promise<SessionPatternResponse[]> {
        try {
            const response = await withRetry(
                () => privateApi.get<SessionPatternResponse[]>('/sessions/patterns'),
                this.retryConfig
            );
            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Delete a session pattern by recurrence group ID
     * @param recurrenceGroupId - The recurrence group ID to delete
     * @returns Promise<void>
     */
    async deletePattern(recurrenceGroupId: string): Promise<void> {
        try {
            await withRetry(
                () => privateApi.delete(`/sessions/patterns/${recurrenceGroupId}`),
                this.retryConfig
            );

            // Clear relevant cache entries
            this.clearCacheByPrefix('available-sessions');
            this.clearCacheByPrefix('pattern-sessions');
            this.clearCacheByPrefix('available-slots');

        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get sessions for a specific pattern with caching
     * @param recurrenceGroupId - The pattern's recurrence group ID
     * @param startDate - Optional start date filter (YYYY-MM-DD)
     * @param endDate - Optional end date filter (YYYY-MM-DD)
     * @param useCache - Whether to use cached data (default: true)
     * @returns Promise<SessionResponse[]>
     */
    async getPatternSessions(
        recurrenceGroupId: string,
        startDate?: string,
        endDate?: string,
        useCache: boolean = true
    ): Promise<SessionResponse[]> {
        try {
            // Create cache key based on parameters
            const cacheKey = this.createCacheKey('pattern-sessions', {
                recurrenceGroupId,
                startDate,
                endDate
            });

            // Check cache first if enabled
            if (useCache) {
                const cachedData = this.getFromCache<SessionResponse[]>(cacheKey);
                if (cachedData) {
                    return cachedData;
                }
            }

            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const response = await withRetry(
                () => privateApi.get<SessionResponse[]>(
                    `/sessions/patterns/${recurrenceGroupId}/sessions?${params.toString()}`
                ),
                this.retryConfig
            );

            // Cache the response
            if (useCache) {
                this.setCache(cacheKey, response.data, this.defaultCacheTTL);
            }

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get available sessions for booking with optional filtering and caching
     * @param filters - Optional filters for sessions
     * @param useCache - Whether to use cached data (default: true)
     * @returns Promise<SessionResponse[]>
     */
    async getAvailableSessions(filters?: SessionFilters, useCache: boolean = true): Promise<SessionResponse[]> {
        try {
            // Create cache key based on filters
            const cacheKey = this.createCacheKey('available-sessions', filters);

            // Check cache first if enabled
            if (useCache) {
                const cachedData = this.getFromCache<SessionResponse[]>(cacheKey);
                if (cachedData) {
                    return cachedData;
                }
            }

            const params = new URLSearchParams();
            if (filters?.doctorId) params.append('doctor_id', filters.doctorId.toString());
            if (filters?.sessionType) params.append('session_type', filters.sessionType);
            if (filters?.startDate) params.append('start_date', filters.startDate);
            if (filters?.endDate) params.append('end_date', filters.endDate);

            const response = await withRetry(
                () => privateApi.get<SessionResponse[]>(
                    `/sessions/available?${params.toString()}`
                ),
                this.retryConfig
            );

            // Cache the response
            if (useCache) {
                this.setCache(cacheKey, response.data, this.availableSessionsCacheTTL);
            }

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get available slots for a specific session with caching
     * @param sessionId - The session ID to get slots for
     * @param useCache - Whether to use cached data (default: true)
     * @returns Promise<SlotResponse[]>
     */
    async getAvailableSlots(sessionId: number, useCache: boolean = true): Promise<SlotResponse[]> {
        try {
            // Create cache key for this session's available slots
            const cacheKey = this.createCacheKey('available-slots', { sessionId });

            // Check cache first if enabled
            if (useCache) {
                const cachedData = this.getFromCache<SlotResponse[]>(cacheKey);
                if (cachedData) {
                    return cachedData;
                }
            }

            const response = await withRetry(
                () => privateApi.get<SlotResponse[]>(`/sessions/${sessionId}/slots/available`),
                this.retryConfig
            );

            // Cache the response
            if (useCache) {
                this.setCache(cacheKey, response.data, this.availableSlotsCacheTTL);
            }

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get all slots for a specific session (including booked ones)
     * @param sessionId - The session ID to get slots for
     * @returns Promise<SlotResponse[]>
     */
    async getSessionSlots(sessionId: number): Promise<SlotResponse[]> {
        try {
            const response = await withRetry(
                () => privateApi.get<SlotResponse[]>(`/sessions/${sessionId}/slots`),
                this.retryConfig
            );
            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Create slots for a session
     * @param sessionId - The session ID to create slots for
     * @param slots - Array of slot data to create
     * @returns Promise<SlotResponse[]>
     */
    async createSessionSlots(sessionId: number, slots: SlotData[]): Promise<SlotResponse[]> {
        try {
            const response = await withRetry(
                () => privateApi.post<SlotResponse[]>(`/sessions/${sessionId}/slots`, { slots }),
                this.retryConfig
            );

            // Clear slot-related cache entries
            this.clearCacheByPrefix('available-slots');

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Update a specific slot
     * @param sessionId - The session ID
     * @param slotId - The slot ID to update
     * @param slotData - Updated slot data
     * @returns Promise<SlotResponse>
     */
    async updateSlot(sessionId: number, slotId: number, slotData: Partial<SlotData>): Promise<SlotResponse> {
        try {
            const response = await withRetry(
                () => privateApi.patch<SlotResponse>(`/sessions/${sessionId}/slots/${slotId}`, slotData),
                this.retryConfig
            );

            // Clear slot-related cache entries
            this.clearCacheByPrefix('available-slots');

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Delete a specific slot
     * @param sessionId - The session ID
     * @param slotId - The slot ID to delete
     * @returns Promise<void>
     */
    async deleteSlot(sessionId: number, slotId: number): Promise<void> {
        try {
            await withRetry(
                () => privateApi.delete(`/sessions/${sessionId}/slots/${slotId}`),
                this.retryConfig
            );

            // Clear slot-related cache entries
            this.clearCacheByPrefix('available-slots');

        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get a specific session by ID
     * @param sessionId - The session ID
     * @returns Promise<SessionResponse>
     */
    async getSession(sessionId: number): Promise<SessionResponse> {
        try {
            const response = await withRetry(
                () => privateApi.get<SessionResponse>(`/sessions/${sessionId}`),
                this.retryConfig
            );
            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Update a specific session
     * @param sessionId - The session ID to update
     * @param sessionData - Updated session data
     * @returns Promise<SessionResponse>
     */
    async updateSession(sessionId: number, sessionData: Partial<SessionCreateRequest>): Promise<SessionResponse> {
        try {
            const response = await withRetry(
                () => privateApi.patch<SessionResponse>(`/sessions/${sessionId}`, sessionData),
                this.retryConfig
            );

            // Clear relevant cache entries
            this.clearCacheByPrefix('available-sessions');
            this.clearCacheByPrefix('pattern-sessions');

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Delete a specific session
     * @param sessionId - The session ID to delete
     * @returns Promise<void>
     */
    async deleteSession(sessionId: number): Promise<void> {
        try {
            await withRetry(
                () => privateApi.delete(`/sessions/${sessionId}`),
                this.retryConfig
            );

            // Clear related cache entries
            this.clearCacheByPrefix('available-sessions');
            this.clearCacheByPrefix('available-slots');
            this.clearCacheByPrefix('pattern-sessions');
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get available sessions with advanced filtering options
     * @param options - Advanced filtering options
     * @returns Promise<SessionResponse[]>
     */
    async getAvailableSessionsAdvanced(options: {
        doctorId?: number;
        sessionType?: SessionType;
        dateRange?: {
            start: string; // YYYY-MM-DD
            end: string; // YYYY-MM-DD
        };
        timeRange?: {
            startTime: string; // HH:MM
            endTime: string; // HH:MM
        };
        minDuration?: number; // minimum session duration in minutes
        hasAvailableSlots?: boolean;
        useCache?: boolean;
    }): Promise<SessionResponse[]> {
        try {
            const filters: SessionFilters = {};

            if (options.doctorId) filters.doctorId = options.doctorId;
            if (options.sessionType) filters.sessionType = options.sessionType;
            if (options.dateRange) {
                filters.startDate = options.dateRange.start;
                filters.endDate = options.dateRange.end;
            }

            // Create cache key with all options
            const cacheKey = this.createCacheKey('available-sessions-advanced', options);

            // Check cache first if enabled
            if (options.useCache !== false) {
                const cachedData = this.getFromCache<SessionResponse[]>(cacheKey);
                if (cachedData) {
                    return cachedData;
                }
            }

            const params = new URLSearchParams();
            if (filters.doctorId) params.append('doctor_id', filters.doctorId.toString());
            if (filters.sessionType) params.append('session_type', filters.sessionType);
            if (filters.startDate) params.append('start_date', filters.startDate);
            if (filters.endDate) params.append('end_date', filters.endDate);
            if (options.timeRange?.startTime) params.append('start_time', options.timeRange.startTime);
            if (options.timeRange?.endTime) params.append('end_time', options.timeRange.endTime);
            if (options.minDuration) params.append('min_duration', options.minDuration.toString());
            if (options.hasAvailableSlots !== undefined) {
                params.append('has_available_slots', options.hasAvailableSlots.toString());
            }

            const response = await withRetry(
                () => privateApi.get<SessionResponse[]>(
                    `/sessions/available?${params.toString()}`
                ),
                this.retryConfig
            );

            // Cache the response
            if (options.useCache !== false) {
                this.setCache(cacheKey, response.data, this.availableSessionsCacheTTL);
            }

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get available sessions for a specific date range with pagination
     * @param startDate - Start date (YYYY-MM-DD)
     * @param endDate - End date (YYYY-MM-DD)
     * @param options - Additional options
     * @returns Promise<{ sessions: SessionResponse[]; totalCount: number; hasMore: boolean }>
     */
    async getAvailableSessionsPaginated(
        startDate: string,
        endDate: string,
        options: {
            page?: number;
            pageSize?: number;
            doctorId?: number;
            sessionType?: SessionType;
            useCache?: boolean;
        } = {}
    ): Promise<{ sessions: SessionResponse[]; totalCount: number; hasMore: boolean }> {
        try {
            const page = options.page || 1;
            const pageSize = options.pageSize || 20;

            // Create cache key
            const cacheKey = this.createCacheKey('available-sessions-paginated', {
                startDate,
                endDate,
                ...options
            });

            // Check cache first if enabled
            if (options.useCache !== false) {
                const cachedData = this.getFromCache<{ sessions: SessionResponse[]; totalCount: number; hasMore: boolean }>(cacheKey);
                if (cachedData) {
                    return cachedData;
                }
            }

            const params = new URLSearchParams();
            params.append('start_date', startDate);
            params.append('end_date', endDate);
            params.append('page', page.toString());
            params.append('page_size', pageSize.toString());

            if (options.doctorId) params.append('doctor_id', options.doctorId.toString());
            if (options.sessionType) params.append('session_type', options.sessionType);

            const response = await withRetry(
                () => privateApi.get<{
                    sessions: SessionResponse[];
                    total_count: number;
                    has_more: boolean;
                }>(`/sessions/available/paginated?${params.toString()}`),
                this.retryConfig
            );

            const result = {
                sessions: response.data.sessions,
                totalCount: response.data.total_count,
                hasMore: response.data.has_more
            };

            // Cache the response
            if (options.useCache !== false) {
                this.setCache(cacheKey, result, this.availableSessionsCacheTTL);
            }

            return result;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Cache management methods
     */

    /**
     * Create a cache key from a prefix and parameters
     * @param prefix - The cache key prefix
     * @param params - Parameters to include in the key
     * @returns string
     */
    private createCacheKey(prefix: string, params?: Record<string, any>): string {
        if (!params) return prefix;

        const sortedParams = Object.keys(params)
            .sort()
            .reduce((result, key) => {
                if (params[key] !== undefined && params[key] !== null) {
                    result[key] = params[key];
                }
                return result;
            }, {} as Record<string, any>);

        const paramString = JSON.stringify(sortedParams);
        return `${prefix}:${paramString}`;
    }

    /**
     * Get data from cache if it exists and is not expired
     * @param key - Cache key
     * @returns T | null
     */
    private getFromCache<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        const now = Date.now();
        if (now > entry.timestamp + entry.ttl) {
            // Entry expired, remove it
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set data in cache with TTL
     * @param key - Cache key
     * @param data - Data to cache
     * @param ttl - Time to live in milliseconds
     */
    private setCache<T>(key: string, data: T, ttl: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    /**
     * Clear all cached data
     */
    public clearCache(): void {
        this.cache.clear();
    }

    /**
     * Clear cache entries matching a prefix
     * @param prefix - Cache key prefix to clear
     */
    public clearCacheByPrefix(prefix: string): void {
        const keysToDelete: string[] = [];
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Clear expired cache entries
     */
    public clearExpiredCache(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.timestamp + entry.ttl) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.cache.delete(key));
    }

    /**
     * Get cache statistics
     * @returns Object with cache statistics
     */
    public getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }

    /**
     * ========================================
     * APPOINTMENT SLOT ENDPOINTS (NEW API)
     * ========================================
     */

    /**
     * Get available slots for a specific doctor
     * @param doctorId - The doctor's user ID
     * @param startDate - Optional start date filter (YYYY-MM-DD)
     * @param filters - Optional additional filters
     * @param useCache - Whether to use cached data (default: true)
     * @returns Promise<SlotResponse[]>
     */
    async getAvailableSlotsForDoctor(
        doctorId: number,
        startDate?: string,
        filters?: Omit<AppointmentSlotFilters, 'doctorId' | 'startDate'>,
        useCache: boolean = true
    ): Promise<SlotResponse[]> {
        try {
            // Create cache key
            const cacheKey = this.createCacheKey('appointment-available-slots', {
                doctorId,
                startDate,
                ...filters
            });

            // Check cache first if enabled
            if (useCache) {
                const cachedData = this.getFromCache<SlotResponse[]>(cacheKey);
                if (cachedData) {
                    return cachedData;
                }
            }

            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (filters?.endDate) params.append('end_date', filters.endDate);
            if (filters?.slotType) params.append('slot_type', filters.slotType);
            if (filters?.modality) params.append('modality', filters.modality);

            const response = await withRetry(
                () => privateApi.get<SlotResponse[]>(
                    `/appointments/available-slots/${doctorId}?${params.toString()}`
                ),
                this.retryConfig
            );

            // Filter out blocked/booked slots if requested
            let slots = response.data;
            if (filters?.onlyAvailable) {
                slots = slots.filter(slot => !slot.is_blocked && !slot.is_booked);
            }

            // Cache the response
            if (useCache) {
                this.setCache(cacheKey, slots, this.availableSlotsCacheTTL);
            }

            return slots;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get available slots for the logged-in doctor
     * @param startDate - Optional start date filter (YYYY-MM-DD)
     * @param filters - Optional additional filters
     * @param useCache - Whether to use cached data (default: true)
     * @returns Promise<SlotResponse[]>
     */
    async getMyAvailableSlots(
        startDate?: string,
        filters?: Omit<AppointmentSlotFilters, 'doctorId'>,
        useCache: boolean = true
    ): Promise<SlotResponse[]> {
        try {
            // Create cache key
            const cacheKey = this.createCacheKey('appointment-my-available-slots', {
                startDate,
                ...filters
            });

            // Check cache first if enabled
            if (useCache) {
                const cachedData = this.getFromCache<SlotResponse[]>(cacheKey);
                if (cachedData) {
                    return cachedData;
                }
            }

            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (filters?.endDate) params.append('end_date', filters.endDate);
            if (filters?.slotType) params.append('slot_type', filters.slotType);
            if (filters?.modality) params.append('modality', filters.modality);

            const response = await withRetry(
                () => privateApi.get<SlotResponse[]>(
                    `/appointments/me/available-slots?${params.toString()}`
                ),
                this.retryConfig
            );

            // Filter out blocked/booked slots if requested
            let slots = response.data;
            if (filters?.onlyAvailable) {
                slots = slots.filter(slot => !slot.is_blocked && !slot.is_booked);
            }

            // Cache the response
            if (useCache) {
                this.setCache(cacheKey, slots, this.availableSlotsCacheTTL);
            }

            return slots;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get all available slots for the logged-in doctor (no date filter)
     * @param useCache - Whether to use cached data (default: true)
     * @returns Promise<SlotResponse[]>
     */
    async getAllMyAvailableSlots(useCache: boolean = true): Promise<SlotResponse[]> {
        try {
            // Create cache key
            const cacheKey = 'appointment-all-my-available-slots';

            // Check cache first if enabled
            if (useCache) {
                const cachedData = this.getFromCache<SlotResponse[]>(cacheKey);
                if (cachedData) {
                    return cachedData;
                }
            }

            const response = await withRetry(
                () => privateApi.get<SlotResponse[]>('/appointments/me/all-available-slots'),
                this.retryConfig
            );

            // Cache the response
            if (useCache) {
                this.setCache(cacheKey, response.data, this.availableSlotsCacheTTL);
            }

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Get details for a specific slot
     * @param slotId - The slot ID
     * @returns Promise<SlotResponse>
     */
    async getSlotDetails(slotId: number): Promise<SlotResponse> {
        try {
            const response = await withRetry(
                () => privateApi.get<SlotResponse>(`/appointments/slot/${slotId}`),
                this.retryConfig
            );
            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Block a specific slot
     * @param slotId - The slot ID to block
     * @returns Promise<BlockSlotResponse> - Returns the updated slot object
     */
    async blockSlot(slotId: number): Promise<BlockSlotResponse> {
        try {
            const response = await withRetry(
                () => privateApi.post<BlockSlotResponse>(`/appointments/slot/${slotId}/block`),
                this.retryConfig
            );

            // Clear slot-related cache entries
            this.clearCacheByPrefix('appointment-available-slots');
            this.clearCacheByPrefix('appointment-my-available-slots');
            this.clearCacheByPrefix('appointment-all-my-available-slots');

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Unblock a specific slot
     * @param slotId - The slot ID to unblock
     * @returns Promise<BlockSlotResponse> - Returns the updated slot object
     */
    async unblockSlot(slotId: number): Promise<BlockSlotResponse> {
        try {
            const response = await withRetry(
                () => privateApi.post<BlockSlotResponse>(`/appointments/slot/${slotId}/unblock`),
                this.retryConfig
            );

            // Clear slot-related cache entries
            this.clearCacheByPrefix('appointment-available-slots');
            this.clearCacheByPrefix('appointment-my-available-slots');
            this.clearCacheByPrefix('appointment-all-my-available-slots');

            return response.data;
        } catch (error) {
            throw this.handleApiError(error);
        }
    }

    /**
     * Handle API errors and convert them to appropriate error types
     * @param error - The error from the API call
     * @returns ApiError
     */
    private handleApiError(error: any): ApiError {
        if (error.response?.status === 400) {
            return new ValidationError(error.response.data.detail || 'Validation failed');
        } else if (error.response?.status === 401) {
            return new AuthenticationError();
        } else if (error.response?.status === 403) {
            return new ValidationError('Access denied');
        } else if (error.response?.status === 404) {
            return new ValidationError('Resource not found');
        } else if (error.response?.status === 409) {
            return new ValidationError(error.response.data.detail || 'Conflict occurred');
        } else if (error.response?.status >= 500) {
            return new ServerError();
        } else if (error.code === 'NETWORK_ERROR' || !error.response) {
            return new NetworkError();
        } else {
            return new ServerError();
        }
    }
}

// Export a singleton instance
export const sessionApiService = new SessionApiService();

// Export default for convenience
export default sessionApiService;