import { ErrorCode, ErrorDetails } from "./error.interface"

// Base RPC Message
export interface RpcMessageBase {
  jsonrpc: "2.0"
  id: string | number | null
}

// RPC Request
export interface RpcRequest extends RpcMessageBase {
  method: string
  params?: Record<string, unknown>
}

// RPC Response
export interface RpcResponse extends RpcMessageBase {
  result?: unknown
  error?: {
    code: ErrorCode
    message: string
    data?: unknown
  }
}

// RPC Method Type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RpcMethod = (params: any) => Promise<unknown> | void | undefined

// RPC Method Schema
export interface RpcMethodSchema {
  name: string
  description: string
  parameters: Record<
    string,
    {
      type: string
      description: string
      required: boolean
    }
  >
  returns: {
    type: string
    description: string
  }
}

// RPC Method Definition
export interface RpcMethodDefinition {
  method: RpcMethod
  name: string
  schema?: RpcMethodSchema
  validate?: (params: unknown) => Promise<{ valid: boolean; message?: string }>
}

// RPC Extension Registry
export interface RpcMethodRegistry {
  [key: string]: RpcMethodDefinition
}

// Type Validation
export interface ValidationResult {
  isValid: boolean
  errors?: Array<ErrorDetails>
}

// Base Configuration
export interface Config {
  enabled: boolean
  options?: Record<string, unknown>
}
