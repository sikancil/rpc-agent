/**
 * Log Level Enumeration
 * Defines the severity levels for logging
 */
export enum LogLevel {
  /**
   * Error level for error conditions
   */
  ERROR = "error",
  /**
   * Warning level for potential issues
   */
  WARNING = "warning",
  /**
   * Info level for normal operations
   */
  INFO = "info",
  /**
   * Debug level for detailed information
   */
  DEBUG = "debug",
  /**
   * Verbose level for very detailed information
   */
  VERBOSE = "verbose",
}

/**
 * Logger Interface
 * Defines the structure for log entries
 */
export interface LogMetadata {
  level?: LogLevel
  format?: "simple" | "detailed"
  traceId?: string
  duration?: string
  [key: string]: unknown
}
