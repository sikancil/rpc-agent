export interface RpcClientConfig {
  host: string
  port: number
  udpPort: number
  protocol: "tcp" | "udp"
}

export interface JsonRpcRequest {
  jsonrpc: "2.0"
  method: string
  params: Record<string, unknown>
  id: string | number | null
}

export interface JsonRpcResponse {
  jsonrpc: "2.0"
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
  id: string | number | null
}

export interface ExtensionStatus {
  name: string
  status: string
  metadata?: Record<string, unknown>
}

export interface ExtensionListResponse {
  result: {
    extensions: ExtensionStatus[]
    total: number
  }
}

export interface PortValidationResult {
  valid: boolean
  port: number
  type: string
}

export interface SystemInfo {
  hostname: string
  platform: string
  arch: string
  cpus: Array<{
    model: string
    speed: number
    times: {
      user: number
      nice: number
      sys: number
      idle: number
      irq: number
    }
  }>
  memory: {
    total: number
    free: number
    used: number
  }
  uptime: number
  loadavg: number[]
}

export interface DateInfo {
  timestamp: string
  unix: number
  utc: string
  local: string
  timezone: string
}

export interface EchoResponse {
  message: string
  timestamp: string
}
