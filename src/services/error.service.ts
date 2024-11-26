/**
 * Error Service - RPC Error Management
 * @packageDocumentation
 */

import { ErrorCode, ErrorDetails, JSONValue } from "../interfaces"

/**
 * RPC Error - Custom error class for RPC operations
 * @class RpcError
 *
 * @extends Error
 * @description
 * Specialized error class for RPC operations with JSON-RPC 2.0 error codes
 * and standardized error formatting.
 *
 * @example
 * ```typescript
 * throw new RpcError({
 *   code: ErrorCode.METHOD_NOT_FOUND,
 *   message: "Method 'test' not found",
 *   requestId: "123"
 * })
 * ```
 */
export class RpcError extends Error {
  readonly code: ErrorCode
  readonly details?: Record<string, JSONValue>
  readonly timestamp: string
  readonly requestId?: string | number | null
  readonly source?: string
  readonly errorId: string

  /**
   * Create RPC Error
   * @param params - Error parameters
   *
   * @validation
   * - Required error code
   * - Required error message
   * - Optional details object
   * - Optional request ID
   * - Optional source
   */
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

  /**
   * Convert error to JSON format
   * @returns Object - JSON representation of error
   *
   * @format
   * {
   *   code: number,
   *   message: string,
   *   data?: {
   *     details: object,
   *     requestId?: string | number
   *   }
   * }
   */
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

  /**
   * Create an RpcError instance from a JSON object
   * @param json - ErrorDetails object containing error information
   * @returns RpcError instance
   *
   * @example
   * ```typescript
   * const errorJson = {
   *   message: "An error occurred",
   *   code: ErrorCode.INTERNAL_ERROR,
   *   details: { additionalInfo: "Some details" },
   *   requestId: "req-123",
   *   source: "backend"
   * };
   * const error = ErrorService.fromJSON(errorJson);
   * ```
   */
  static fromJSON(json: ErrorDetails): RpcError {
    // Reconstruct RpcError from JSON representation
    // Useful for deserializing errors from network responses or storage
    return new RpcError({
      message: json.message,
      code: json.code,
      details: json.details,
      requestId: json.requestId,
      source: json.source,
    })
    // Note: timestamp and errorId are regenerated in the constructor
  }
}

/**
 * Error Service - Factory methods for RPC errors
 * @class ErrorService
 *
 * @description
 * Provides factory methods for creating standardized RPC errors
 * with proper error codes and formatting.
 *
 * @example
 * ```typescript
 * throw ErrorService.methodNotFound("Method not found", { method: "test" })
 * ```
 */
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

  /**
   * Create parse error
   * @param message - Error message
   * @param details - Optional error details
   * @returns RpcError
   *
   * @error-code -32700
   * @description Invalid JSON received
   */
  static parseError(message = "Parse error", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.PARSE_ERROR, message, undefined, details)
  }

  /**
   * Create invalid request error
   * @param message - Error message
   * @param details - Optional error details
   * @returns RpcError
   *
   * @error-code -32600
   * @description Invalid Request object
   */
  static invalidRequest(message = "Invalid request", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.INVALID_REQUEST, message, undefined, details)
  }

  /**
   * Create method not found error
   * @param message - Error message (default: "Method not found")
   * @param details - Optional error details
   * @returns {RpcError} RPC error object
   *
   * @error-code -32601
   * @description The requested method does not exist or is not available
   *
   * // Integration: Used in RPC method resolution
   * @tips: Ensure method names are correctly spelled and registered
   *   1. Check if method exists
   *   2. If not, throw this error
   */
  static methodNotFound(message = "Method not found", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.METHOD_NOT_FOUND, message, undefined, details)
  }

  /**
   * Create invalid params error
   * @param message - Error message
   * @param field - Field name
   * @param details - Optional error details
   * @returns RpcError
   *
   * @error-code -32602
   * @description Invalid method parameters
   */
  static invalidParams(message: string, field?: string, details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.INVALID_PARAMS, message, field, details)
  }

  /**
   * Create internal error
   * @param message - Error message
   * @param details - Optional error details
   * @returns RpcError
   *
   * @error-code -32603
   * @description Internal JSON-RPC error
   */
  static internalError(message = "Internal error", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.INTERNAL_ERROR, message, undefined, details)
  }

  /**
   * Create request timeout error
   * @param message - Error message
   * @param details - Optional error details
   * @returns RpcError
   *
   * @error-code -32000
   * @description Request timeout
   */
  static requestTimeout(message = "Request timeout", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.TIMEOUT, message, undefined, details)
  }

  /**
   * Create extension not found error
   * @param message - Error message
   * @param details - Optional error details
   * @returns RpcError
   *
   * @error-code -32001
   * @description Extension not found
   */
  static extensionNotFound(message = "Extension not found", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.EXTENSION_NOT_FOUND, message, undefined, details)
  }

  /**
   * Create service unavailable error
   * @param message - Error message
   * @param details - Optional error details
   * @returns RpcError
   *
   * @error-code -32002
   * @description Service unavailable
   */
  static serviceUnavailable(message = "Service unavailable", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.SERVICE_UNAVAILABLE, message, undefined, details)
  }

  /**
   * Create unauthorized error
   * @param message - Error message
   * @param details - Optional error details
   * @returns RpcError
   *
   * @error-code -32003
   * @description Unauthorized
   */
  static unauthorized(message = "Unauthorized", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.UNAUTHORIZED, message, undefined, details)
  }

  /**
   * Create forbidden error
   * @param message - Error message
   * @param details - Optional error details
   * @returns RpcError
   *
   * @error-code -32004
   * @description Forbidden
   */
  static forbidden(message = "Forbidden", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.FORBIDDEN, message, undefined, details)
  }

  /**
   * Create rate limited error
   * @param message - Error message
   * @param details - Optional error details
   * @returns RpcError
   *
   * @error-code -32005
   * @description Rate limited
   */
  static rateLimited(message = "Rate limited", details?: Record<string, JSONValue>): RpcError {
    return this.createError(ErrorCode.RATE_LIMITED, message, undefined, details)
  }

  /**
   * Check if error is RpcError
   * @param error - Error to check
   * @returns boolean
   */
  static isRpcError(error: unknown): error is RpcError {
    return error instanceof RpcError
  }

  /**
   * Wrap error in RpcError
   * @param error - Error to wrap
   * @returns RpcError
   */
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
