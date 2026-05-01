/**
 * Comprehensive Error Handling Service
 * 
 * This service provides centralized error handling for the session management system,
 * including error classification, user-friendly messaging, and logging capabilities.
 */

// ---- Error Types ----

/**
 * Base abstract class for all API errors
 */
export abstract class ApiError extends Error {
  abstract readonly type: string;
  abstract readonly userMessage: string;
  readonly originalError?: any;
  readonly timestamp: string;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = this.constructor.name;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Validation error - occurs when API returns 400 status
 */
export class ValidationError extends ApiError {
  readonly type = 'validation';
  readonly userMessage: string;

  constructor(message: string, originalError?: any) {
    super(message, originalError);
    this.userMessage = this.formatValidationMessage(message);
  }

  private formatValidationMessage(message: string): string {
    // Handle common validation error patterns
    if (message.includes('time')) {
      return 'Please check your time values and ensure they are in the correct format (HH:MM).';
    }
    if (message.includes('required')) {
      return 'Please fill in all required fields.';
    }
    if (message.includes('overlap')) {
      return 'Time slots cannot overlap. Please adjust your slot times.';
    }
    if (message.includes('pattern')) {
      return 'Please check your pattern configuration. Only one pattern type can be used at a time.';
    }
    if (message.includes('duration')) {
      return 'Session duration must be valid. End time must be after start time.';
    }
    
    // Return the original message if no specific pattern matches
    return message || 'Please check your input and try again.';
  }
}

/**
 * Authentication error - occurs when API returns 401 status
 */
export class AuthenticationError extends ApiError {
  readonly type = 'authentication';
  readonly userMessage = 'Your session has expired. Please log in again to continue.';

  constructor(message?: string, originalError?: any) {
    super(message || 'Authentication required', originalError);
  }
}

/**
 * Authorization error - occurs when API returns 403 status
 */
export class AuthorizationError extends ApiError {
  readonly type = 'authorization';
  readonly userMessage = 'You do not have permission to perform this action.';

  constructor(message?: string, originalError?: any) {
    super(message || 'Access forbidden', originalError);
  }
}

/**
 * Not found error - occurs when API returns 404 status
 */
export class NotFoundError extends ApiError {
  readonly type = 'not_found';
  readonly userMessage: string;

  constructor(message?: string, originalError?: any) {
    super(message || 'Resource not found', originalError);
    this.userMessage = this.formatNotFoundMessage(message);
  }

  private formatNotFoundMessage(message?: string): string {
    if (message?.includes('session')) {
      return 'The requested session could not be found. It may have been deleted.';
    }
    if (message?.includes('pattern')) {
      return 'The requested session pattern could not be found.';
    }
    return 'The requested resource could not be found.';
  }
}

/**
 * Conflict error - occurs when API returns 409 status
 */
export class ConflictError extends ApiError {
  readonly type = 'conflict';
  readonly userMessage: string;

  constructor(message?: string, originalError?: any) {
    super(message || 'Conflict occurred', originalError);
    this.userMessage = this.formatConflictMessage(message);
  }

  private formatConflictMessage(message?: string): string {
    if (message?.includes('booked')) {
      return 'Cannot delete this pattern because it has booked sessions. Please cancel all bookings first.';
    }
    if (message?.includes('overlap')) {
      return 'This action would create conflicting schedules. Please check for overlapping sessions.';
    }
    return message || 'This action conflicts with existing data. Please review and try again.';
  }
}

/**
 * Server error - occurs when API returns 500+ status
 */
export class ServerError extends ApiError {
  readonly type = 'server';
  readonly userMessage = 'A server error occurred. Please try again in a few moments.';

  constructor(message?: string, originalError?: any) {
    super(message || 'Internal server error', originalError);
  }
}

/**
 * Network error - occurs when request fails due to network issues
 */
export class NetworkError extends ApiError {
  readonly type = 'network';
  readonly userMessage = 'Network connection failed. Please check your internet connection and try again.';

  constructor(message?: string, originalError?: any) {
    super(message || 'Network request failed', originalError);
  }
}

/**
 * Rate limit error - occurs when API returns 429 status
 */
export class RateLimitError extends ApiError {
  readonly type = 'rate_limit';
  readonly userMessage = 'Too many requests. Please wait a moment before trying again.';

  constructor(message?: string, originalError?: any) {
    super(message || 'Rate limit exceeded', originalError);
  }
}

// ---- Error Classification Logic ----

/**
 * Classifies an error based on the HTTP response or error type
 */
export function classifyError(error: any): ApiError {
  // Handle network errors (no response)
  if (!error.response) {
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return new NetworkError(error.message, error);
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return new NetworkError('Request timeout. Please try again.', error);
    }
    return new NetworkError(error.message, error);
  }

  // Handle HTTP status codes
  const status = error.response.status;
  const message = error.response.data?.detail || error.response.data?.message || error.message;

  switch (status) {
    case 400:
      return new ValidationError(message, error);
    case 401:
      return new AuthenticationError(message, error);
    case 403:
      return new AuthorizationError(message, error);
    case 404:
      return new NotFoundError(message, error);
    case 409:
      return new ConflictError(message, error);
    case 429:
      return new RateLimitError(message, error);
    case 500:
    case 502:
    case 503:
    case 504:
      return new ServerError(message, error);
    default:
      // For unknown status codes, default to server error
      return new ServerError(`Unexpected error (${status}): ${message}`, error);
  }
}

// ---- Error Logging ----

/**
 * Error logging levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Error logging interface
 */
export interface ErrorLogEntry {
  level: LogLevel;
  message: string;
  error: ApiError;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

/**
 * Error logger class for centralized logging
 */
export class ErrorLogger {
  private static instance: ErrorLogger;
  private logs: ErrorLogEntry[] = [];

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  /**
   * Log an error with context
   */
  log(error: ApiError, level: LogLevel = LogLevel.ERROR, context?: Record<string, any>): void {
    const logEntry: ErrorLogEntry = {
      level,
      message: error.message,
      error,
      context,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
    };

    this.logs.push(logEntry);

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 ${level.toUpperCase()}: ${error.type}`);
      console.error('Message:', error.message);
      console.error('User Message:', error.userMessage);
      console.error('Timestamp:', error.timestamp);
      if (context) console.error('Context:', context);
      if (error.originalError) console.error('Original Error:', error.originalError);
      console.groupEnd();
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(logEntry);
    }
  }

  /**
   * Get recent error logs
   */
  getRecentLogs(limit: number = 50): ErrorLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Clear error logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Get current user ID from context (implement based on your auth system)
   */
  private getCurrentUserId(): string | undefined {
    // This should be implemented based on your authentication system
    // For now, return undefined
    return undefined;
  }

  /**
   * Get current session ID from context
   */
  private getCurrentSessionId(): string | undefined {
    // Generate or retrieve session ID for tracking
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('error_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('error_session_id', sessionId);
      }
      return sessionId;
    }
    return undefined;
  }

  /**
   * Send error to external logging service (implement based on your logging provider)
   */
  private sendToExternalLogger(logEntry: ErrorLogEntry): void {
    // Implement integration with your logging service (e.g., Sentry, LogRocket, etc.)
    // For now, this is a placeholder
    console.warn('External logging not implemented yet:', logEntry);
  }
}

// ---- Error Handler Utility Functions ----

/**
 * Main error handler function that processes any error and returns a classified ApiError
 */
export function handleApiError(error: any, context?: Record<string, any>): ApiError {
  const classifiedError = classifyError(error);
  const logger = ErrorLogger.getInstance();
  
  // Log the error with context
  logger.log(classifiedError, LogLevel.ERROR, context);
  
  return classifiedError;
}

/**
 * Retry mechanism for network errors
 */
export interface RetryOptions {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier?: number;
  retryCondition?: (error: ApiError) => boolean;
}

/**
 * Default retry condition - only retry network and server errors
 */
export const defaultRetryCondition = (error: ApiError): boolean => {
  return error.type === 'network' || error.type === 'server';
};

/**
 * Retry wrapper for async operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    maxRetries,
    delayMs,
    backoffMultiplier = 2,
    retryCondition = defaultRetryCondition
  } = options;

  let lastError: ApiError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = handleApiError(error, { attempt, maxRetries });
      
      // Don't retry if this is the last attempt or if retry condition is not met
      if (attempt === maxRetries || !retryCondition(lastError)) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = delayMs * Math.pow(backoffMultiplier, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * User-friendly error message mapping for common scenarios
 */
export const ERROR_MESSAGES = {
  // Session creation errors
  SESSION_NAME_REQUIRED: 'Please enter a session name.',
  SESSION_TIME_INVALID: 'Please enter valid start and end times.',
  SESSION_TIME_OVERLAP: 'Session times cannot overlap with existing sessions.',
  SESSION_PATTERN_INVALID: 'Please select either a simple weekly pattern or an advanced recurring pattern, not both.',
  
  // Slot creation errors
  SLOT_TIME_INVALID: 'Slot times must be within the session time range.',
  SLOT_OVERLAP: 'Slots cannot overlap with each other.',
  SLOT_TYPE_REQUIRED: 'Please select a slot type.',
  
  // Pattern management errors
  PATTERN_DELETE_FAILED: 'Cannot delete pattern with booked sessions.',
  PATTERN_NOT_FOUND: 'Session pattern not found.',
  
  // General errors
  NETWORK_ERROR: 'Please check your internet connection and try again.',
  SERVER_ERROR: 'Server error occurred. Please try again later.',
  AUTHENTICATION_ERROR: 'Please log in to continue.',
  AUTHORIZATION_ERROR: 'You do not have permission to perform this action.',
} as const;

/**
 * Get user-friendly error message by key
 */
export function getErrorMessage(key: keyof typeof ERROR_MESSAGES): string {
  return ERROR_MESSAGES[key];
}

// Export singleton logger instance
export const errorLogger = ErrorLogger.getInstance();