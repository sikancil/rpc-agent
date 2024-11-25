import * as net from "node:net"
import * as dgram from "node:dgram"

import { RpcClientConfig, JsonRpcRequest, JsonRpcResponse } from "./interfaces"
import { ExtensionStatus, PortValidationResult, SystemInfo, DateInfo, EchoResponse } from "./interfaces"

export class RpcClient {
  private availableExtensions: Set<string> = new Set(["echo"])
  private tcpClient: net.Socket | null = null
  private udpClient: dgram.Socket | null = null
  private requestId = 0
  private isClosing: boolean = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectDelay = 1000 // Start with 1 second
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>()
  protected readonly config: RpcClientConfig
  protected readonly debug: boolean

  constructor(config: RpcClientConfig, debug: boolean = false) {
    this.config = {
      ...config,
      // Ensure UDP port is always set for server communication
      udpPort: config.udpPort || 9102,
    }
    this.debug = debug
    if (this.debug) {
      console.log("[RpcClient] Initialized with config:", this.config)
    }
  }

  protected log(...args: unknown[]): void {
    if (this.debug) {
      console.log("[RpcClient]", ...args)
    }
  }

  async init(): Promise<void> {
    if (this.config.protocol === "tcp") {
      await this.initializeTcpClient()
    } else if (this.config.protocol === "udp") {
      await this.initializeUdpClient()
    }
  }

  async close(): Promise<void> {
    if (this.isClosing) {
      return
    }
    this.isClosing = true

    // Clear all pending requests
    for (const [id, { reject, timeout }] of this.pendingRequests) {
      clearTimeout(timeout)
      reject(new Error("Client closing"))
      this.pendingRequests.delete(id)
    }

    return new Promise<void>((resolve) => {
      const cleanup = (): void => {
        if (this.tcpClient) {
          this.tcpClient.removeAllListeners()
          this.tcpClient.end()
          this.tcpClient = null
        }

        if (this.udpClient) {
          try {
            this.udpClient.removeAllListeners()
            this.udpClient.close(() => {
              this.udpClient = null
              resolve()
            })
          } catch (error) {
            this.log("Error closing UDP socket:", error)
            this.udpClient = null
            resolve()
          }
        } else {
          resolve()
        }
      }

      // Set a timeout to force cleanup after 1 second
      setTimeout(cleanup, 1000)
    }).finally(() => {
      this.isClosing = false
      this.reconnectAttempts = 0
    })
  }

  protected async initializeTcpClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tcpClient = new net.Socket()

      // Set up connection timeout
      const connectionTimeout = setTimeout(() => {
        reject(new Error("Connection timeout"))
        this.tcpClient?.destroy()
      }, 5000)

      this.tcpClient.connect(this.config.port, this.config.host, () => {
        clearTimeout(connectionTimeout)
        this.reconnectAttempts = 0
        this.log("TCP client connected")
        resolve()
      })

      this.tcpClient.on("error", (error) => {
        clearTimeout(connectionTimeout)
        this.log("TCP client error:", error)
        this.handleConnectionError(error).catch((e) => this.log("Reconnection failed:", e))
        reject(error)
      })

      this.tcpClient.on("close", () => {
        this.log("TCP connection closed")
        if (!this.isClosing) {
          this.handleConnectionError(new Error("Connection closed")).catch((e) => this.log("Reconnection failed:", e))
        }
      })

      this.tcpClient.on("data", this.handleTcpResponse.bind(this))

      // Set keep-alive to detect stale connections
      this.tcpClient.setKeepAlive(true, 60000)
    })
  }

  protected async initializeUdpClient(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create UDP socket
        this.udpClient = dgram.createSocket({
          type: "udp4",
          reuseAddr: true,
        })

        // Handle errors
        this.udpClient.on("error", (error) => {
          this.log("UDP client error:", error)
          reject(error)
        })

        // Handle incoming messages
        this.udpClient.on("message", (msg: Buffer, rinfo: dgram.RemoteInfo) => {
          this.handleUdpResponse(msg, rinfo)
        })

        // Bind to any available port (let OS choose)
        this.udpClient.bind(0, () => {
          const address = this.udpClient?.address()
          this.log("UDP client bound to port:", address?.port)
          resolve()
        })
      } catch (error) {
        this.log("Failed to initialize UDP client:", error)
        reject(error)
      }
    })
  }

  private handleUdpResponse(data: Buffer, rinfo?: dgram.RemoteInfo): void {
    try {
      const response = JSON.parse(data.toString()) as JsonRpcResponse
      this.log("Received UDP response:", response, rinfo ? `from ${rinfo?.address}:${rinfo?.port}` : "")

      const pendingRequest = this.pendingRequests.get(response.id?.toString() || "")
      if (pendingRequest) {
        const { resolve, reject, timeout } = pendingRequest
        clearTimeout(timeout)
        this.pendingRequests.delete(response.id?.toString() || "")

        if (response.error) {
          reject(new Error(response.error.message || "Unknown RPC error"))
        } else {
          resolve(response.result)
        }
      } else {
        this.log("No pending request found for response ID:", response.id)
      }
    } catch (error) {
      this.log("Error parsing UDP response:", error, rinfo ? `from ${rinfo?.address}:${rinfo?.port}` : "")
    }
  }

  private async handleConnectionError(error: Error): Promise<void> {
    if (this.isClosing || this.reconnectAttempts >= this.maxReconnectAttempts) {
      throw error
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    this.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`)

    await new Promise((resolve) => setTimeout(resolve, delay))
    await this.init()
  }

  private handleTcpResponse(data: Buffer): void {
    try {
      const response = JSON.parse(data.toString()) as JsonRpcResponse
      this.log("Received response:", response)

      const pendingRequest = this.pendingRequests.get(response.id?.toString() || "")
      if (pendingRequest) {
        const { resolve, reject, timeout } = pendingRequest
        clearTimeout(timeout)
        this.pendingRequests.delete(response.id?.toString() || "")

        if (response.error) {
          reject(new Error(response.error.message || "Unknown RPC error"))
        } else {
          resolve(response.result)
        }
      }
    } catch (error) {
      this.log("Error parsing response:", error)
    }
  }

  async send<T>(method: string, params: Record<string, unknown>): Promise<T> {
    if (this.config.protocol === "tcp") {
      return this.sendTcpRequest<T>(method, params)
    } else if (this.config.protocol === "udp") {
      return this.sendUdpRequest<T>(method, params)
    } else {
      throw new Error("Unsupported protocol")
    }
  }

  protected async sendTcpRequest<T>(method: string, params: Record<string, unknown>): Promise<T> {
    if (!this.tcpClient) {
      throw new Error("TCP client not initialized")
    }

    this.log(`Sending TCP request - Method: ${method}, Params:`, params)
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString()
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        method,
        params,
        id: requestId,
      }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error("Request timeout"))
      }, 30000)

      this.pendingRequests.set(requestId, { resolve, reject, timeout })

      const data = JSON.stringify(request) + "\n"
      if (!this.tcpClient?.write(data)) {
        this.tcpClient?.once("drain", () => {
          this.log("Write buffer drained")
        })
      }
    })
  }

  protected async sendUdpRequest<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const client = this.udpClient
    if (!client) {
      throw new Error("UDP client not initialized")
    }

    this.log(`Sending UDP request - Method: ${method}, Params:`, params)
    return new Promise((resolve, reject) => {
      const requestId = Date.now().toString()
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        method,
        params,
        id: requestId,
      }

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        reject(new Error("Request timeout"))
      }, 5000)

      this.pendingRequests.set(requestId, { resolve, reject, timeout })

      const data = JSON.stringify(request)
      client.send(data, this.config.udpPort, this.config.host, (error) => {
        if (error) {
          clearTimeout(timeout)
          this.pendingRequests.delete(requestId)
          reject(error)
        }
      })
    })
  }
}

export class AgentLibrary extends RpcClient {
  constructor(config: RpcClientConfig, debug: boolean = false) {
    super(config, debug)
  }

  async getServerInfo(): Promise<SystemInfo> {
    return this.send<SystemInfo>("server.system", {})
  }

  async listExtensions(): Promise<ExtensionStatus[]> {
    const extensions = await this.send<ExtensionStatus[]>("extensions.list", {})
    return extensions || []
  }

  async validatePort(port: number, type: "TCP" | "UDP"): Promise<PortValidationResult> {
    return this.send<PortValidationResult>("network.validatePort", { port, type })
  }

  async echo(message: string): Promise<EchoResponse> {
    return this.send<EchoResponse>("echo.echo", { message })
  }

  async getCurrentDate(): Promise<DateInfo> {
    return this.send<DateInfo>("date.now", {})
  }
}
