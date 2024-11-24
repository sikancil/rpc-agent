import { Config, RpcMethod as ExtensionMethod } from "./rpc.interface"
import { DynamicSchema as ExtensionSchema } from "./schema.interface"

// Extension Status Type
export type ExtensionStatus = "active" | "inactive" | "error"

export interface ExtensionConfig extends Config {
  enabled: boolean
  [key: string]: unknown
}

// Extension Metadata
export interface ExtensionMetadata {
  name: string
  version: string
  description: string
  author?: string
  dependencies?: string[]
  [key: string]: unknown
}

// Extension Method
export { RpcMethod as ExtensionMethod } from "./rpc.interface"
export { DynamicSchema as ExtensionSchema } from "./schema.interface"

// Extension Interface
export interface Extension {
  name: string
  status: ExtensionStatus
  config: ExtensionConfig
  metadata: ExtensionMetadata
  methods: Record<string, ExtensionMethod>
  validate?: (params: unknown) => Promise<{ valid: boolean; message?: string }>
  schema?: ExtensionSchema
}
