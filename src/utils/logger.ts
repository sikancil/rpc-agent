import { LogLevel, LogMetadata } from "../interfaces"

/**
 * Logger Utility - Structured logging for RPC Agent
 * @packageDocumentation
 */

/**
 * Logger - Structured logging utility for RPC Agent
 * @class Logger
 *
 * @description
 * Provides structured logging with trace IDs, log levels, and JSON formatting.
 * Supports debug, info, warning, and error levels with optional context details.
 *
 * @example
 * ```typescript
 * logger.info("Server started", { port: 8080 })
 * const traceId = logger.startTrace("Processing request")
 * logger.error("Request failed", { error, traceId })
 * ```
 *
 * @features
 * - Trace ID Generation
 * - Structured JSON Logging
 * - Multiple Log Levels
 * - Context Details
 */
export class Logger {
  private readonly logLevel: LogLevel
  private readonly logFormat: "simple" | "detailed"
  private readonly traceIds: Map<string, [number, number]>
  private readonly logLevelPriority: Record<LogLevel, number>

  /**
   * Create a new logger instance
   * @param logLevel - Log level (default: INFO)
   * @param logFormat - Log format (default: simple)
   */
  constructor(logLevel: LogLevel = LogLevel.INFO, logFormat: "simple" | "detailed" = "simple") {
    this.logLevel = logLevel
    this.logFormat = logFormat
    this.traceIds = new Map()
    this.logLevelPriority = {
      [LogLevel.ERROR]: 0,
      [LogLevel.WARNING]: 1,
      [LogLevel.INFO]: 2,
      [LogLevel.DEBUG]: 3,
      [LogLevel.VERBOSE]: 4,
    }
  }

  /**
   * Log error message
   * @param message - Error message
   * @param metadata - Optional metadata
   *
   * @usage
   * - Error conditions
   * - Exception details
   * - Stack traces
   *
   * @error-handling
   * - Sanitize sensitive data
   * - Include stack traces
   * - Add context details
   */
  error(message: string, metadata: LogMetadata = {}): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      metadata.level = LogLevel.ERROR
      console.error(this.formatMessage(message, metadata))
    }
  }

  /**
   * Log warning message
   * @param message - Warning message
   * @param metadata - Optional metadata
   *
   * @usage
   * - Potential issues
   * - Deprecation notices
   * - Recovery actions
   */
  warning(message: string, metadata: LogMetadata = {}): void {
    if (this.shouldLog(LogLevel.WARNING)) {
      metadata.level = LogLevel.WARNING
      console.warn(this.formatMessage(message, metadata))
    }
  }

  /**
   * Log info message
   * @param message - Info message
   * @param metadata - Optional metadata
   *
   * @usage
   * - Normal operations
   * - Status updates
   * - Success messages
   */
  info(message: string, metadata: LogMetadata = {}): void {
    if (this.shouldLog(LogLevel.INFO)) {
      metadata.level = LogLevel.INFO
      console.info(this.formatMessage(message, metadata))
    }
  }

  /**
   * Log debug message
   * @param message - Debug message
   * @param metadata - Optional metadata
   *
   * @usage
   * - Development debugging
   * - Verbose information
   * - Temporary logging
   */
  debug(message: string, metadata: LogMetadata = {}): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      metadata.level = LogLevel.DEBUG
      console.debug(this.formatMessage(message, metadata))
    }
  }

  /**
   * Log verbose message
   * @param message - Verbose message
   * @param metadata - Optional metadata
   *
   * @usage
   * - Very detailed information
   * - Debugging purposes
   */
  verbose(message: string, metadata: LogMetadata = {}): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      metadata.level = LogLevel.VERBOSE
      console.debug(this.formatMessage(message, metadata))
    }
  }

  /**
   * Start a trace for request tracking
   * @param message - Initial trace message
   * @param metadata - Optional metadata
   * @returns string - Generated trace ID
   *
   * @workflow
   * 1. Generate unique trace ID
   * 2. Log trace start
   * 3. Store trace timestamp
   * 4. Return trace ID
   *
   * @usage
   * - Track request lifecycle
   * - Correlate related logs
   * - Measure operation duration
   */
  startTrace(message: string, metadata: LogMetadata = {}): string {
    const traceId = Math.random().toString(36).substring(2, 15)
    this.traceIds.set(traceId, process.hrtime())
    metadata.traceId = traceId
    this.info(message, metadata)
    return traceId
  }

  /**
   * End a trace and log duration
   * @param traceId - Trace ID to end
   * @param message - Final trace message
   * @param metadata - Optional metadata
   *
   * @workflow
   * 1. Get trace start time
   * 2. Calculate duration
   * 3. Log trace end
   * 4. Clean up trace
   *
   * @performance
   * - Calculates duration in ms
   * - Cleans up trace memory
   * - Provides timing metrics
   */
  endTrace(traceId: string, message: string, metadata: LogMetadata = {}): void {
    const start = this.traceIds.get(traceId)
    if (start) {
      const [seconds, nanoseconds] = process.hrtime(start)
      const duration = seconds * 1000 + nanoseconds / 1000000
      metadata.traceId = traceId
      metadata.duration = `${duration.toFixed(3)}ms`
      this.info(message, metadata)
      this.traceIds.delete(traceId)
    }
  }

  /**
   * Check if log level is enabled
   * @param level - Log level to check
   * @returns boolean - Whether log level is enabled
   */
  private shouldLog(level: LogLevel): boolean {
    return this.logLevelPriority[level] <= this.logLevelPriority[this.logLevel]
  }

  /**
   * Format log message
   * @param message - Log message
   * @param metadata - Optional metadata
   * @returns string - Formatted log message
   */
  private formatMessage(message: string, metadata: LogMetadata = {}): string {
    const timestamp = new Date().toISOString()
    const level = metadata.level || LogLevel.INFO
    const format = metadata.format || this.logFormat

    if (format === "simple") {
      const metaStr = metadata.traceId ? ` [${metadata.traceId}]` : ""
      const durationStr = metadata.duration ? ` (${metadata.duration})` : ""
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}${durationStr}`
    }

    const metadataStr = Object.entries(metadata)
      .filter(([key]) => !["timestamp", "level", "format"].includes(key))
      .map(([key, value]) => `${key}=${this.safeStringify(value)}`)
      .join(" ")

    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metadataStr}`
  }

  /**
   * Safely stringify value
   * @param value - Value to stringify
   * @returns string - Stringified value
   */
  private safeStringify(value: unknown): string {
    try {
      return typeof value === "object" ? JSON.stringify(value) : String(value)
    } catch {
      return "[Circular]"
    }
  }
}

/**
 * Global logger instance
 * Singleton logger for consistent logging across the application
 */
export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || (process.env.LOG_LEVEL as LogLevel) || LogLevel.VERBOSE,
  (process.env.LOG_FORMAT as "simple" | "detailed") || "detailed",
)
