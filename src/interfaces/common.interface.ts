// Basic Types
export type PrimitiveType = "string" | "number" | "boolean" | "object" | "array" | "null"

export type JSONPrimitive = string | number | boolean | null | undefined
export type JSONArray = JSONValue[]
export type JSONObject = { [key: string]: JSONValue }

export type JSONValue = string | number | boolean | null | undefined | JSONValue[] | { [key: string]: JSONValue }

export enum Protocol {
  TCP = "tcp",
  UDP = "udp",
  // HTTP = "http",
  // WEBSOCKET = "ws",
}

export interface ProtocolConfig {
  protocolType: Protocol
  host: string
  port: number
  timeout?: number
}

export interface CreateAgentOptions {
  protocols: ProtocolConfig[]
}
