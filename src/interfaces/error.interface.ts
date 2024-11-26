import { JSONValue } from "./common.interface"

// JSON-RPC 2.0 Error Codes
export enum ErrorCode {
  // JSON-RPC 2.0 Reserved Codes (-32768 to -32000)
  PARSE_ERROR = -32700, // Invalid JSON was received
  INVALID_REQUEST = -32600, // The JSON sent is not a valid Request object
  METHOD_NOT_FOUND = -32601, // The method does not exist / is not available
  INVALID_PARAMS = -32602, // Invalid method parameter(s)
  INTERNAL_ERROR = -32603, // Internal JSON-RPC error

  // Custom Server Error Codes (-32000 to -32099)
  SERVER_ERROR = -32000, // Generic server error
  EXTENSION_NOT_FOUND = -32001, // Extension not found
  EXTENSION_INIT_FAILED = -32002, // Extension initialization failed
  VALIDATION_FAILED = -32003, // Request validation failed
  SERVICE_UNAVAILABLE = -32004, // Service is temporarily unavailable

  // HTTP Status Codes (for future HTTP/WS implementations)
  HTTP_SUCCESS = 200,
  HTTP_CREATED = 201,
  HTTP_BAD_REQUEST = 400,
  HTTP_UNAUTHORIZED = 401,
  HTTP_NOT_FOUND = 404,
  HTTP_METHOD_NOT_ALLOWED = 405,
  HTTP_VALIDATION_FAILED = 422,
  HTTP_INTERNAL_ERROR = 500,
  HTTP_NOT_IMPLEMENTED = 501,
  HTTP_SERVICE_UNAVAILABLE = 503,

  // Extension Specific (for future extensions)
  EXT_ERROR = 1000,
  EXT_NOT_FOUND = 1001,
  EXT_INIT_FAILED = 1002,
  EXT_PARSE_ERROR = 1003,

  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  TIMEOUT = 408,
  RATE_LIMITED = 429,
}

export interface ErrorDetails {
  errorId?: string
  code: ErrorCode
  message: string
  details?: Record<string, JSONValue>
  field?: string
  timestamp?: string
  source?: string
  requestId?: string | number | null
}

/**
 * RPC Error Interface
 * @interface RpcErrorParams
 *
 * @property code - Error code
 * @property message - Error message
 * @property details - Optional error details
 * @property requestId - Associated request ID
 * @property source - Error source
 */
export interface RpcErrorParams {
  code: ErrorCode
  message: string
  details?: Record<string, JSONValue>
  requestId?: string | number | null
  source?: string
}
