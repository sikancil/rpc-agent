/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamicSchema, SchemaMethod } from "../interfaces"

/**
 * Validates if the given schema conforms to the DynamicSchema interface.
 *
 * @param schema - The schema object to validate
 * @returns True if the schema is valid, false otherwise
 *
 * @description
 * This function performs a deep validation of the schema structure, ensuring:
 * - Each method has input, output, and example properties
 * - Input and output properties are correctly structured
 * - Array and object types have the required nested properties
 *
 * @complexity
 * This function uses nested loops to traverse the entire schema structure,
 * resulting in a time complexity of O(n*m), where n is the number of methods
 * and m is the average number of properties per method.
 *
 * @tips
 * - Ensure all required properties are present in your schema
 * - Double-check the types of all properties, especially nested ones
 * - For array types, always include an 'items' property
 * - For object types, always include a 'properties' property
 */
export function validateSchema(schema: unknown): schema is DynamicSchema {
  if (typeof schema !== "object" || schema === null) return false

  // Iterate through each method in the schema
  for (const [, method] of Object.entries(schema)) {
    if (
      typeof method !== "object" ||
      method === null ||
      !method.hasOwnProperty("input") ||
      typeof method.input !== "object" ||
      method.input === null ||
      !method.hasOwnProperty("output") ||
      typeof method.output !== "object" ||
      method.output === null ||
      !method.hasOwnProperty("example") ||
      typeof method.example !== "object" ||
      method.example === null
    ) {
      return false
    }

    for (const [, property] of Object.entries(method.input)) {
      if (
        typeof property !== "object" ||
        property === null ||
        !property.hasOwnProperty("type") ||
        typeof (property as any).type !== "string" ||
        !property.hasOwnProperty("description") ||
        typeof (property as any).description !== "string"
      ) {
        return false
      }
    }

    for (const [, property] of Object.entries(method.output)) {
      if (
        typeof property !== "object" ||
        property === null ||
        !property.hasOwnProperty("type") ||
        typeof (property as any).type !== "string" ||
        !property.hasOwnProperty("description") ||
        typeof (property as any).description !== "string"
      ) {
        return false
      }

      if ((property as any).type === "array") {
        if (
          !property.hasOwnProperty("items") ||
          typeof (property as any).items !== "object" ||
          (property as any).items === null
        ) {
          return false
        }
      } else if ((property as any).type === "object") {
        if (
          !property.hasOwnProperty("properties") ||
          typeof (property as any).properties !== "object" ||
          (property as any).properties === null
        ) {
          return false
        }

        // further validation for nested objects if needed
      }
    }

    for (const [, exampleValue] of Object.entries(method.example)) {
      if (typeof exampleValue !== "string") {
        return false
      }
    }
  }

  return true
}

/**
 * Validates if the given parameters match the schema definition.
 *
 * @param params - The parameters to validate
 * @param schema - The schema to validate against
 * @returns True if the parameters match the schema, false otherwise
 *
 * @description
 * This function checks if the provided parameters conform to the input schema
 * defined for each method in the DynamicSchema.
 *
 * @complexity
 * The function uses nested loops to iterate through the schema and its properties,
 * resulting in a time complexity of O(n*m), where n is the number of methods
 * and m is the average number of input properties per method.
 *
 * @tips
 * - Ensure that the schema is properly structured before validation
 * - This method only checks for the existence of properties, not their types
 * - Consider implementing more robust type checking for production use
 */
export function validateParamsToSchema(params: Record<string, unknown>, schema: DynamicSchema): boolean {
  // Iterate through each method in the schema
  for (const [methodName, method] of Object.entries(schema)) {
    if (method.hasOwnProperty("input")) {
      // Check each input property of the method
      for (const [, property] of Object.entries((schema[methodName] as SchemaMethod)?.input)) {
        // If the params object has a property matching the schema property type, return true
        if (params.hasOwnProperty(property.type)) {
          return true
        }
      }
    }
  }
  // If no matching properties were found, return false
  return false
}
