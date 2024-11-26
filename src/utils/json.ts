// utils.ts
import { logger } from "./logger"
import { JSONValue } from "../interfaces"

/**
 * Parses a JSON string into a JSONValue object.
 *
 * @param str - The JSON string to parse
 * @returns The parsed JSONValue object
 * @throws {Error} If parsing fails
 *
 * @example
 * const jsonStr = '{"key": "value"}'
 * const parsed = parseJSON(jsonStr)
 *
 * @integration
 * - Uses logger for verbose logging and error reporting
 * - Integrates with JSONValue type from interfaces
 *
 * @tips
 * - Ensure input is a valid JSON string
 * - Handle potential errors when calling this function
 */
export function parseJSON(str: string): JSONValue {
  try {
    // Log verbose information about parsing attempt
    logger.verbose("Parsing JSON data", { size: str.length })

    // Attempt to parse the JSON string
    const result = JSON.parse(str) as JSONValue

    // Log successful parsing
    logger.debug("JSON parsed successfully")

    return result
  } catch (error) {
    // Log detailed error information
    logger.error("Failed to parse JSON", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Throw a new error with a descriptive message
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Converts a JSONValue object to a JSON string.
 *
 * @param value - The JSONValue object to stringify
 * @returns The stringified JSON
 * @throws {Error} If stringification fails
 *
 * @example
 * const obj = { key: "value" }
 * const jsonStr = stringifyJSON(obj)
 *
 * @integration
 * - Uses logger for verbose logging and error reporting
 * - Works with JSONValue type from interfaces
 *
 * @tips
 * - Ensure input is a valid JSONValue object
 * - Handle potential errors when calling this function
 */
export function stringifyJSON(value: JSONValue): string {
  try {
    // Log verbose information about stringification attempt
    logger.verbose("Stringifying JSON data")

    // Attempt to stringify the JSONValue object
    const result = JSON.stringify(value)

    // Log successful stringification with result size
    logger.debug("JSON stringified successfully", { size: result.length })

    return result
  } catch (error) {
    // Log detailed error information
    logger.error("Failed to stringify JSON", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Throw a new error with a descriptive message
    throw new Error(`Failed to stringify JSON: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Checks if a value is a valid JSON value.
 *
 * @param value - The value to check
 * @returns True if the value is a valid JSON value, false otherwise
 *
 * @example
 * const isValid = isValidJSON({ key: "value" }) // true
 * const isInvalid = isValidJSON(() => {}) // false
 *
 * @integration
 * - Uses JSONValue type from interfaces
 * - Integrates with JSON.stringify for validation
 *
 * @tips
 * - This function considers primitives, objects, and arrays as valid JSON
 * - Functions, symbols, and undefined are not valid JSON values
 */
export function isValidJSON(value: unknown): value is JSONValue {
  try {
    // Attempt to stringify the value
    // If successful, it's a valid JSON value
    JSON.stringify(value)
    return true
  } catch {
    // If stringification fails, it's not a valid JSON value
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

/**
 * Safely converts a JSON value to a string.
 *
 * @param value - The JSON value to stringify
 * @returns A string representation of the JSON value
 *
 * @example
 * const jsonString = safeJSONString({ key: "value" }) // '{"key":"value"}'
 * const fallbackString = safeJSONString(Symbol("test")) // 'Symbol(test)'
 *
 * @integration
 * - Uses JSONValue type from interfaces
 * - Integrates with JSON.stringify for serialization
 *
 * @tips
 * - Handles non-serializable values by falling back to String() conversion
 * - Useful for logging or displaying JSON data safely
 */
export function safeJSONString(value: JSONValue): string {
  try {
    // Attempt to stringify the JSON value
    return JSON.stringify(value)
  } catch {
    // If stringification fails, fall back to string conversion
    return String(value)
  }
}

export default { parseJSON, stringifyJSON, safeJSONParse, safeJSONString, isValidJSON }
