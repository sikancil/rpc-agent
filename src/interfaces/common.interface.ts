// Basic Types
export type PrimitiveType = "string" | "number" | "boolean" | "object" | "array" | "null"

export type JSONPrimitive = string | number | boolean | null | undefined
export type JSONArray = JSONValue[]
export type JSONObject = { [key: string]: JSONValue }

export type JSONValue = string | number | boolean | null | undefined | JSONValue[] | { [key: string]: JSONValue }

export interface MethodDoc {
  name: string
  description: string
  parameters?: Record<string, ParameterSchema>
  returns?: {
    type: string
    description: string
  }
}

export interface ParameterSchema {
  type: string
  description: string
  required: boolean
  default?: JSONValue
}

export interface RpcError {
  code: number
  message: string
  data?: unknown
}
