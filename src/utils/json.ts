// utils.ts
import { logger } from "./logger"
import { JSONValue } from "../interfaces/common.interface"

export function parseJSON(str: string): JSONValue {
  try {
    logger.verbose("Parsing JSON data", { size: str.length })
    const result = JSON.parse(str) as JSONValue
    logger.debug("JSON parsed successfully")
    return result
  } catch (error) {
    logger.error("Failed to parse JSON", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export function stringifyJSON(value: JSONValue): string {
  try {
    logger.verbose("Stringifying JSON data")
    const result = JSON.stringify(value)
    logger.debug("JSON stringified successfully", { size: result.length })
    return result
  } catch (error) {
    logger.error("Failed to stringify JSON", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw new Error(`Failed to stringify JSON: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export function isValidJSON(value: unknown): value is JSONValue {
  try {
    JSON.stringify(value)
    return true
  } catch {
    return false
  }
}

export function safeJSONParse<T extends JSONValue = JSONValue>(value: string): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return value as T
  }
}

export function safeJSONString(value: JSONValue): string {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export default { parseJSON, stringifyJSON, safeJSONParse, safeJSONString, isValidJSON }
