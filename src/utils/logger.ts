// Logger implementation for the RPC Agent

import { LogLevel, LogMetadata } from "../interfaces"

export class Logger {
  private readonly logLevel: LogLevel
  private readonly logFormat: "simple" | "detailed"
  private readonly traceIds: Map<string, [number, number]>
  private readonly logLevelPriority: Record<LogLevel, number>

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

  error(message: string, metadata: LogMetadata = {}): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      metadata.level = LogLevel.ERROR
      console.error(this.formatMessage(message, metadata))
    }
  }

  warning(message: string, metadata: LogMetadata = {}): void {
    if (this.shouldLog(LogLevel.WARNING)) {
      metadata.level = LogLevel.WARNING
      console.warn(this.formatMessage(message, metadata))
    }
  }

  info(message: string, metadata: LogMetadata = {}): void {
    if (this.shouldLog(LogLevel.INFO)) {
      metadata.level = LogLevel.INFO
      console.info(this.formatMessage(message, metadata))
    }
  }

  debug(message: string, metadata: LogMetadata = {}): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      metadata.level = LogLevel.DEBUG
      console.debug(this.formatMessage(message, metadata))
    }
  }

  verbose(message: string, metadata: LogMetadata = {}): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      metadata.level = LogLevel.VERBOSE
      console.debug(this.formatMessage(message, metadata))
    }
  }

  startTrace(message: string, metadata: LogMetadata = {}): string {
    const traceId = Math.random().toString(36).substring(2, 15)
    this.traceIds.set(traceId, process.hrtime())
    metadata.traceId = traceId
    this.info(message, metadata)
    return traceId
  }

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

  private shouldLog(level: LogLevel): boolean {
    return this.logLevelPriority[level] <= this.logLevelPriority[this.logLevel]
  }

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

  private safeStringify(value: unknown): string {
    try {
      return typeof value === "object" ? JSON.stringify(value) : String(value)
    } catch {
      return "[Circular]"
    }
  }
}

// Export singleton instance
export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || (process.env.LOG_LEVEL as LogLevel) || LogLevel.VERBOSE,
  (process.env.LOG_FORMAT as "simple" | "detailed") || "detailed",
)
