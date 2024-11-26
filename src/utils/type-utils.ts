import { RpcRequest, RpcResponse, JSONValue } from "../interfaces"

/**
 * Type guard for checking if a value is an object
 * @param value - The value to check
 * @returns True if the value is an object, false otherwise
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Type guard for checking if a value is a string
 * @param value - The value to check
 * @returns True if the value is a string, false otherwise
 */
export function isString(value: unknown): value is string {
  return typeof value === "string"
}

/**
 * Type guard for checking if a value is a number
 * @param value - The value to check
 * @returns True if the value is a number, false otherwise
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value)
}

/**
 * Type guard for checking if a value is a boolean
 * @param value - The value to check
 * @returns True if the value is a boolean, false otherwise
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean"
}

/**
 * Type guard for checking if a value is an array
 * @param value - The value to check
 * @returns True if the value is an array, false otherwise
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Type guard for checking if a value is a valid JSON-RPC request
 * @param value - The value to check
 * @returns True if the value is a valid JSON-RPC request, false otherwise
 *
 * @remarks
 * Checks for the presence and correct types of jsonrpc, method, id, and params fields
 */
export function isJsonRpcRequest(value: unknown): value is RpcRequest {
  if (!isObject(value)) return false

  const { jsonrpc, method, id, params } = value as Partial<RpcRequest>

  return (
    jsonrpc === "2.0" &&
    typeof method === "string" &&
    (typeof id === "string" || typeof id === "number" || id === null) &&
    (params === undefined || isObject(params))
  )
}

/**
 * Type guard for checking if a value is a valid JSON-RPC response
 * @param value - The value to check
 * @returns True if the value is a valid JSON-RPC response, false otherwise
 *
 * @remarks
 * Checks for the presence and correct types of jsonrpc, id, result, and error fields
 */
export function isJsonRpcResponse(value: unknown): value is RpcResponse {
  if (!isObject(value)) return false

  const { jsonrpc, id, result, error } = value as Partial<RpcResponse>

  const hasValidId = typeof id === "string" || typeof id === "number" || id === null
  const hasValidResult = result !== undefined
  const hasValidError =
    error !== undefined && isObject(error) && typeof error.code === "number" && typeof error.message === "string"

  return jsonrpc === "2.0" && hasValidId && (hasValidResult || hasValidError)
}

/**
 * Type guard for checking if a value is a valid JSON-RPC batch request
 * @param value - The value to check
 * @returns True if the value is a valid JSON-RPC batch request, false otherwise
 */
export function isJsonRpcBatchRequest(value: unknown): value is RpcRequest[] {
  return isArray(value) && value.every(isJsonRpcRequest)
}

/**
 * Type guard for checking if a value is a valid JSON-RPC batch response
 * @param value - The value to check
 * @returns True if the value is a valid JSON-RPC batch response, false otherwise
 */
export function isJsonRpcBatchResponse(value: unknown): value is RpcResponse[] {
  return isArray(value) && value.every(isJsonRpcResponse)
}

/**
 * Type guard for checking if a value is a valid JSON-RPC error
 * @param value - The value to check
 * @returns True if the value is a valid JSON-RPC error, false otherwise
 *
 * @remarks
 * Checks for the presence and correct types of code and message fields
 */
export function isJsonRpcError(value: unknown): value is RpcResponse["error"] {
  if (!isObject(value)) return false

  const newLocal = value as RpcResponse["error"]

  if (!isObject(newLocal)) return false

  const { code, message } = newLocal

  return typeof code === "number" && typeof message === "string"
}

/**
 * Type guard for checking if a value is a valid JSON value
 * @param value - The value to check
 * @returns True if the value is a valid JSON value, false otherwise
 *
 * @remarks
 * Attempts to stringify the value to determine if it's valid JSON
 */
export function isJsonValue(value: unknown): value is JSONValue {
  try {
    JSON.stringify(value)
    return true
  } catch {
    return false
  }
}

/**
 * Validates params against a given schema
 * @param params - The parameters to validate
 * @param validator - The validation function
 * @returns The validated params
 * @throws Error if params are invalid
 *
 * @remarks
 * This function is generic and can be used with any type of validator
 */
export function validateParams<T>(params: unknown, validator: (value: unknown) => value is T): T {
  if (!validator(params)) {
    throw new Error("Invalid params")
  }
  return params
}
