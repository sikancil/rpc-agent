/* eslint-disable @typescript-eslint/no-explicit-any */
import { DynamicSchema, SchemaMethod } from "../interfaces"

export function validateSchema(schema: unknown): schema is DynamicSchema {
  if (typeof schema !== "object" || schema === null) return false

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

export function validateParamsToSchema(params: Record<string, unknown>, schema: DynamicSchema): boolean {
  for (const [methodName, method] of Object.entries(schema)) {
    if (method.hasOwnProperty("input")) {
      for (const [, property] of Object.entries((schema[methodName] as SchemaMethod)?.input)) {
        if (params.hasOwnProperty(property.type)) {
          return true
        }
      }
    }
  }
  return false
}
