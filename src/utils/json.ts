// utils.ts
import { logger } from "./logger"

export function parseJSON(data: any) {
  try {
    logger.verbose("Parsing JSON data", { size: data.toString().length })
    const result = JSON.parse(data.toString())
    logger.debug("JSON parsed successfully")
    return result
  } catch (error) {
    logger.error("Failed to parse JSON", { error: (error as Error).message })
    throw new Error("Invalid JSON")
  }
}

export function stringifyJSON(data: any) {
  try {
    logger.verbose("Stringifying JSON data")
    const result = JSON.stringify(data)
    logger.debug("JSON stringified successfully", { size: result.length })
    return result
  } catch (error) {
    logger.error("Failed to stringify JSON", {
      error: (error as Error).message,
    })
    const fallback = {
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal error" },
      id: null,
    }
    logger.warning("Using fallback JSON response", { fallback })
    return JSON.stringify(fallback)
  }
}

export default { parseJSON, stringifyJSON }
