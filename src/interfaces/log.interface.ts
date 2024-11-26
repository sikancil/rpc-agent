export enum LogLevel {
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
  DEBUG = "debug",
  VERBOSE = "verbose",
}

export interface LogMetadata {
  level?: LogLevel
  format?: "simple" | "detailed"
  traceId?: string
  duration?: string
  [key: string]: unknown
}
