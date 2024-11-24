import { RpcRequest, RpcResponse } from "../interfaces/rpc.interface"
import { JSONValue } from "../interfaces/common.interface"

/**
 * Type guard for checking if a value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

/**
 * Type guard for checking if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string"
}

/**
 * Type guard for checking if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value)
}

/**
 * Type guard for checking if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean"
}

/**
 * Type guard for checking if a value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Type guard for checking if a value is a valid JSON-RPC request
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
 */
export function isJsonRpcBatchRequest(value: unknown): value is RpcRequest[] {
  return isArray(value) && value.every(isJsonRpcRequest)
}

/**
 * Type guard for checking if a value is a valid JSON-RPC batch response
 */
export function isJsonRpcBatchResponse(value: unknown): value is RpcResponse[] {
  return isArray(value) && value.every(isJsonRpcResponse)
}

/**
 * Type guard for checking if a value is a valid JSON-RPC error
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
 */
export function validateParams<T>(params: unknown, validator: (value: unknown) => value is T): T {
  if (!validator(params)) {
    throw new Error("Invalid params")
  }
  return params
}
