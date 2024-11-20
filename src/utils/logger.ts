import * as fs from "node:fs"
import * as path from "node:path"
import * as os from "node:os"
import { Buffer } from "node:buffer"
import { inspect } from "node:util"
import chalk from "chalk"

export enum LogLevel {
  VERBOSE = 0,
  DEBUG = 1,
  WARNING = 2,
  ERROR = 3,
  INFO = 4,
}

type LogFormat = "detailed" | "compact"

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  metadata?: any
  environment?: string
  traceId?: string
  executionTime?: string
  format?: LogFormat
}

interface LoggerConfig {
  logToFile: boolean
  logDir: string
  maxLogSize: number
  maxLogFiles: number
  logPrefix: string
  environment: string
  prettyPrint: boolean
}

class Logger {
  private debugMode: boolean
  private logLevel: LogLevel
  private config: LoggerConfig
  private currentLogFile: string = ""
  private currentLogSize: number = 0
  private traceIdCounter: number = 0

  constructor() {
    this.debugMode = process.env.DEBUG === "1"
    this.logLevel = Number(process.env.DEBUG_LEVEL || LogLevel.INFO)

    // Default configuration with environment awareness
    this.config = {
      logToFile: process.env.LOG_TO_FILE === "1",
      logDir: process.env.LOG_DIR || path.join(process.cwd(), "logs"),
      maxLogSize: Number(process.env.MAX_LOG_SIZE) || 10 * 1024 * 1024, // 10MB
      maxLogFiles: Number(process.env.MAX_LOG_FILES) || 5,
      logPrefix: process.env.LOG_PREFIX || "agent",
      environment: process.env.NODE_ENV || "development",
      prettyPrint: ["development", "test"].includes(process.env.NODE_ENV || "development"),
    }

    this.initializeLogging()
  }

  private initializeLogging(): void {
    // Create logs directory if logging to file is enabled
    if (this.config.logToFile) {
      try {
        if (!fs.existsSync(this.config.logDir)) {
          fs.mkdirSync(this.config.logDir, { recursive: true })
        }
        this.currentLogFile = this.generateLogFilename()
        this.info("Logger initialized", {
          config: {
            ...this.config,
            environment: this.config.environment,
            debugMode: this.debugMode,
            logLevel: LogLevel[this.logLevel],
          },
        })
      } catch (error) {
        console.error("Failed to initialize file logging:", error)
        this.config.logToFile = false // Disable file logging on error
      }
    }

    // Log startup information
    this.info("Environment configuration loaded", {
      nodeEnv: this.config.environment,
      debugMode: this.debugMode,
      logLevel: LogLevel[this.logLevel],
    })
  }

  private generateLogFilename(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const envPrefix = this.config.environment.toLowerCase()
    return path.join(this.config.logDir, `${this.config.logPrefix}-${envPrefix}-${timestamp}.log`)
  }

  private shouldLog(level: LogLevel): boolean {
    return this.debugMode || level >= this.logLevel
  }

  private formatMessage(level: LogLevel, message: string, metadata?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata,
      environment: this.config.environment,
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.config.logToFile) return

    const logLine = `[${entry.timestamp}] [${entry.environment}] ${LogLevel[entry.level]}: ${entry.message}${
      entry.metadata ? " " + JSON.stringify(entry.metadata) : ""
    }\n`

    try {
      if (this.currentLogSize > this.config.maxLogSize) {
        await this.rotateLogFiles()
      }

      fs.appendFileSync(this.currentLogFile, logLine)
      this.currentLogSize += Buffer.byteLength(logLine)
    } catch (error) {
      console.error("Failed to write to log file:", error)
      this.config.logToFile = false // Disable file logging on error
    }
  }

  private async rotateLogFiles(): Promise<void> {
    try {
      const envPrefix = this.config.environment.toLowerCase()
      const files = fs
        .readdirSync(this.config.logDir)
        .filter((file) => file.startsWith(`${this.config.logPrefix}-${envPrefix}`))
        .sort()

      while (files.length >= this.config.maxLogFiles) {
        const oldestFile = files.shift()
        if (oldestFile) {
          fs.unlinkSync(path.join(this.config.logDir, oldestFile))
        }
      }

      this.currentLogFile = this.generateLogFilename()
      this.currentLogSize = 0
    } catch (error) {
      console.error("Failed to rotate log files:", error)
      this.config.logToFile = false // Disable file logging on error
    }
  }

  private formatOutput(data: any, format?: LogFormat): string {
    if (!this.config.prettyPrint || !format || format !== "detailed") {
      return typeof data === "string" ? data : JSON.stringify(data)
    }
    return inspect(data, {
      colors: true,
      depth: null,
      breakLength: 80,
      compact: false,
    })
  }

  private generateTraceId(): string {
    this.traceIdCounter = (this.traceIdCounter + 1) % 10000
    return `${process.pid}-${Date.now()}-${this.traceIdCounter.toString().padStart(4, "0")}`
  }

  public startTrace(operation: string, metadata?: any): string {
    const traceId = this.generateTraceId()
    this.verbose(`Starting ${operation}`, {
      ...metadata,
      traceId,
      format: "detailed",
    })
    return traceId
  }

  public endTrace(traceId: string, operation: string, metadata?: any, startTime?: [number, number]): void {
    let executionTime: string | undefined
    if (startTime) {
      const [seconds, nanoseconds] = process.hrtime(startTime)
      executionTime = `${(seconds * 1000 + nanoseconds / 1000000).toFixed(2)}ms`
    }

    this.verbose(`Completed ${operation}`, {
      ...metadata,
      traceId,
      executionTime,
      format: "detailed",
    })
  }

  private getColoredOutput(level: LogLevel, message: string, metadata?: any): string {
    const traceInfo = metadata?.traceId ? `[${metadata.traceId}] ` : ""
    const execTime = metadata?.executionTime ? `(${metadata.executionTime}) ` : ""
    const baseMessage = `[${new Date().toISOString()}] [${this.config.environment}] ${LogLevel[level]}: ${traceInfo}${execTime}${message}`

    let formattedMetadata = ""
    if (metadata) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _traceId, _executionTime, format, ...rest } = metadata
      if (Object.keys(rest).length > 0) {
        formattedMetadata = " " + this.formatOutput(rest, format)
      }
    }

    switch (level) {
      case LogLevel.VERBOSE:
        return chalk.gray(baseMessage + formattedMetadata)
      case LogLevel.DEBUG:
        return chalk.blue(baseMessage + formattedMetadata)
      case LogLevel.WARNING:
        return chalk.yellow(baseMessage + formattedMetadata)
      case LogLevel.ERROR:
        return chalk.red(baseMessage + formattedMetadata)
      case LogLevel.INFO:
        return chalk.green(baseMessage + formattedMetadata)
      default:
        return baseMessage + formattedMetadata
    }
  }

  public verbose(message: string, metadata?: any): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      const entry = this.formatMessage(LogLevel.VERBOSE, message, metadata)
      console.log(this.getColoredOutput(LogLevel.VERBOSE, message, metadata))
      this.writeToFile(entry)
    }
  }

  public debug(message: string, metadata?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.formatMessage(LogLevel.DEBUG, message, metadata)
      console.log(this.getColoredOutput(LogLevel.DEBUG, message, metadata))
      this.writeToFile(entry)
    }
  }

  public warning(message: string, metadata?: any): void {
    if (this.shouldLog(LogLevel.WARNING)) {
      const entry = this.formatMessage(LogLevel.WARNING, message, metadata)
      console.log(this.getColoredOutput(LogLevel.WARNING, message, metadata))
      this.writeToFile(entry)
    }
  }

  public error(message: string, metadata?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.formatMessage(LogLevel.ERROR, message, metadata)
      console.error(this.getColoredOutput(LogLevel.ERROR, message, metadata))
      this.writeToFile(entry)
    }
  }

  public info(message: string, metadata?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.formatMessage(LogLevel.INFO, message, metadata)
      console.log(this.getColoredOutput(LogLevel.INFO, message, metadata))
      this.writeToFile(entry)
    }
  }

  // Utility methods
  public getLogFiles(): string[] {
    if (!this.config.logToFile || !fs.existsSync(this.config.logDir)) {
      return []
    }
    const envPrefix = this.config.environment.toLowerCase()
    return fs
      .readdirSync(this.config.logDir)
      .filter((file) => file.startsWith(`${this.config.logPrefix}-${envPrefix}`))
      .map((file) => path.join(this.config.logDir, file))
  }

  public clearLogs(): void {
    if (!this.config.logToFile || !fs.existsSync(this.config.logDir)) {
      return
    }
    const files = this.getLogFiles()
    files.forEach((file) => fs.unlinkSync(file))
    this.info("Log files cleared")
  }

  public getStats(): any {
    return {
      environment: this.config.environment,
      debugMode: this.debugMode,
      logLevel: LogLevel[this.logLevel],
      config: this.config,
      currentLogFile: this.currentLogFile,
      currentLogSize: this.currentLogSize,
      totalLogFiles: this.getLogFiles().length,
      hostname: os.hostname(),
      platform: os.platform(),
      pid: process.pid,
    }
  }
}

export const logger = new Logger()
