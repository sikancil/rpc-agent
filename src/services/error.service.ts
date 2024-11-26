import { ErrorCode, ErrorDetails, JSONValue } from "../interfaces"

export class RpcError extends Error {
  readonly code: ErrorCode
  readonly details?: Record<string, JSONValue>
  readonly timestamp: string
  readonly requestId?: string | number | null
  readonly source?: string
  readonly errorId: string

  constructor({
    message,
    code,
    details,
    requestId,
    source = "rpc-service",
  }: {
    message: string
    code: ErrorCode
    details?: Record<string, JSONValue>
    requestId?: string | number | null
    source?: string
  }) {
    super(message)
    this.name = "RpcError"
    this.code = code
    this.details = details
    this.requestId = requestId
    this.source = source
    this.timestamp = new Date().toISOString()
    this.errorId = `${source}-${this.timestamp}-${Math.random().toString(36).substr(2, 9)}`

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, RpcError.prototype)
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      errorId: this.errorId,
      source: this.source,
      ...(this.requestId !== undefined && { requestId: this.requestId }),
    }
  }

  static fromJSON(json: ErrorDetails): RpcError {
    return new RpcError({
      message: json.message,
      code: json.code,
      details: json.details,
      requestId: json.requestId,
      source: json.source,
    })
  }
}

export class ErrorService {
  private static createError(
    code: ErrorCode,
    message: string,
    field?: string,
    details?: Record<string, JSONValue>,
    requestId?: string | number | null,
    source?: string,
  ): RpcError {
    const errorDetails = {
      ...(details || {}),
      ...(field && { field }),
    }

    return new RpcError({
      message,
      code,
      details: errorDetails,
      requestId,
      source,
    })
  }

  // JSON-RPC 2.0 Standard Errors
  static parseError(message = "Parse error", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.PARSE_ERROR, message, undefined, details)
  }

  static invalidRequest(message = "Invalid request", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.INVALID_REQUEST, message, undefined, details)
  }

  static extensionNotFound(message = "Extension not found", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.EXTENSION_NOT_FOUND, message, undefined, details)
  }

  static methodNotFound(message = "Method not found", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.METHOD_NOT_FOUND, message, undefined, details)
  }

  static invalidParams(message: string, field?: string, details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.INVALID_PARAMS, message, field, details)
  }

  static internalError(message = "Internal error", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.INTERNAL_ERROR, message, undefined, details)
  }

  // Custom Server Errors
  static serviceUnavailable(message = "Service unavailable", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.SERVICE_UNAVAILABLE, message, undefined, details)
  }

  static unauthorized(message = "Unauthorized", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.UNAUTHORIZED, message, undefined, details)
  }

  static forbidden(message = "Forbidden", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.FORBIDDEN, message, undefined, details)
  }

  static requestTimeout(message = "Request timeout", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.TIMEOUT, message, undefined, details)
  }

  static rateLimited(message = "Too many requests", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.RATE_LIMITED, message, undefined, details)
  }

  // Error Type Checking and Wrapping
  static isRpcError(error: unknown): error is RpcError {
    return error instanceof RpcError
  }

  static wrapError(error: unknown): RpcError {
    if (this.isRpcError(error)) {
      return error
    }

    const message = error instanceof Error ? error.message : String(error)
    const details = error instanceof Error ? { stack: error.stack } : undefined

    return this.internalError(message, {
      ...details,
      originalError: String(error),
    })
  }
}
