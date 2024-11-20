import * as net from "node:net"
import * as dgram from "node:dgram"
import * as fs from "node:fs"
import * as path from "node:path"
import { Buffer } from "node:buffer"
import { inspect } from "node:util"
import { parseJSON, stringifyJSON } from "../utils/json"
import { logger } from "../utils/logger"
import { RPCPlugin, PluginRegistry, MethodSchema } from "../interfaces/plugin.interface"

interface RPCRequest {
  jsonrpc: string
  method: string
  params: GetMethodSchema["schema"]["input"]
  id: string | number
}

interface RPCResponse {
  jsonrpc: string
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
  id: string | number | null
  _meta?: {
    protocol: "tcp" | "udp"
    timestamp: string
    serverInfo?: {
      uptime: number
      connections: number
    }
  }
}

interface GetMethodSchema {
  schema: MethodSchema
  examples: {
    shell: string
    node: string
  }
}

// Helper function for formatting debug output
// function formatDebugOutput(data: any): string {
//   if (["development", "test"].includes(process.env.NODE_ENV || "")) {
//     return inspect(data, { colors: true, depth: null, breakLength: 80 })
//   }
//   return JSON.stringify(data)
// }

// Helper function to get method schema and example
function getMethodSchema(plugin: RPCPlugin, methodName: string, tcpPort: number): GetMethodSchema | null {
  const method = plugin.methods[methodName]
  if (!method?.schema) return null

  const schema = method.schema
  const example = schema.example || {}

  return {
    schema,
    examples: {
      shell: `curl -X POST http://localhost:${tcpPort} -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"${plugin.name}.${methodName}","params":${JSON.stringify(example)}, "id":1}'`,
      node: `const response = await fetch('http://localhost:${tcpPort}', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: '${plugin.name}.${methodName}', params: ${JSON.stringify(example)}, id: 1 }) })`,
    },
  }
}

export class RPCService {
  private readonly tcpPort: number
  private readonly udpPort: number
  private readonly plugins: PluginRegistry = {}
  private tcpServer!: net.Server
  private udpServer!: dgram.Socket
  private startTime: number
  private tcpConnections: Set<net.Socket>
  private requestStats: {
    tcp: number
    udp: number
  }

  constructor(
    tcpPort: number = Number(process.env.TCP_PORT) || 9101,
    udpPort: number = Number(process.env.UDP_PORT) || 9102,
  ) {
    // Validate ports using NetworkPlugin
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NetworkPlugin = require("../rpcs/network").default
    const networkPlugin = new NetworkPlugin()
    networkPlugin.methods.validatePort({ port: tcpPort, type: "TCP" })
    networkPlugin.methods.validatePort({ port: udpPort, type: "UDP" })

    if (tcpPort === udpPort) {
      throw new Error(`TCP port (${tcpPort}) and UDP port (${udpPort}) cannot be the same`)
    }

    this.tcpPort = tcpPort
    this.udpPort = udpPort
    this.loadPlugins()
    this.startTime = Date.now()
    this.tcpConnections = new Set()
    this.requestStats = { tcp: 0, udp: 0 }

    logger.info("Initializing RPC Service", {
      tcpPort: this.tcpPort,
      udpPort: this.udpPort,
      pid: process.pid,
    })
  }

  // Initialize servers
  async initialize(): Promise<[boolean, boolean]> {
    return await Promise.all([this.setupTCPServer(), this.setupUDPServer()])
  }

  // Load all plugins from the rpcs directory
  private loadPlugins(): void {
    const pluginsDir = path.join(__dirname, "../rpcs")

    try {
      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const pluginPath = path.join(pluginsDir, entry.name)
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { default: PluginClass } = require(pluginPath)

            if (PluginClass) {
              const plugin = new PluginClass() as RPCPlugin
              this.registerPlugin(plugin)
            }
          } catch (error) {
            logger.error(`Failed to load plugin: ${entry.name}`, {
              error: (error as Error).message,
            })
          }
        }
      }

      logger.info("Plugins loaded successfully", {
        count: Object.keys(this.plugins).length,
        plugins: Object.keys(this.plugins),
      })
    } catch (error) {
      logger.error("Failed to load plugins", {
        error: (error as Error).message,
      })
    }
  }

  // Register a plugin
  private registerPlugin(plugin: RPCPlugin): void {
    if (this.plugins[plugin.name]) {
      logger.warning(`Plugin ${plugin.name} already registered, overwriting`)
    }

    this.plugins[plugin.name] = plugin

    // Enhanced plugin registration logging with schema information
    const methodSchemas = Object.keys(plugin.methods).map((methodName) => {
      const methodInfo = getMethodSchema(plugin, methodName, this.tcpPort)
      return {
        name: methodName,
        ...methodInfo,
      }
    })

    logger.debug(`Registered plugin: ${plugin.name}`, {
      version: plugin.version,
      methods: methodSchemas,
      format: "detailed",
    })
  }

  // Handle RPC requests
  private async handleRequest(request: RPCRequest, protocol: "tcp" | "udp"): Promise<RPCResponse> {
    const startTime = process.hrtime()
    const traceId = logger.startTrace("RPC Request", { protocol, request })
    this.requestStats[protocol]++

    const { jsonrpc, method, params, id } = request

    if (jsonrpc !== "2.0") {
      logger.warning("Invalid JSON-RPC version", {
        traceId,
        version: jsonrpc,
        expected: "2.0",
        format: "detailed",
      })
      return {
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request",
          data: { expected: "2.0", received: jsonrpc },
        },
        id,
      }
    }

    // Parse method name in format: "plugin.method"
    const [pluginName, methodName] = method.split(".")

    if (!pluginName || !methodName) {
      logger.warning("Invalid method format", {
        traceId,
        method,
        format: "detailed",
      })
      return {
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: "Invalid method format. Expected: plugin.method",
          data: { received: method },
        },
        id,
      }
    }

    const plugin = this.plugins[pluginName]
    if (!plugin) {
      logger.warning("Plugin not found", {
        traceId,
        pluginName,
        availablePlugins: Object.keys(this.plugins),
        format: "detailed",
      })
      return {
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: "Plugin not found",
          data: { availablePlugins: Object.keys(this.plugins) },
        },
        id,
      }
    }

    const handler = plugin.methods[methodName]
    if (!handler) {
      logger.warning("Method not found in plugin", {
        traceId,
        pluginName,
        methodName,
        availableMethods: Object.keys(plugin.methods),
        format: "detailed",
      })
      return {
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: "Method not found in plugin",
          data: { availableMethods: Object.keys(plugin.methods) },
        },
        id,
      }
    }

    // Validate parameters against schema
    const schema = plugin.methods[methodName].schema?.input
    if (schema) {
      if (!params || typeof params !== "object") {
        return {
          jsonrpc: "2.0",
          error: {
            code: -32602,
            message: "Invalid params: must be an object",
            data: { received: params },
          },
          id,
        }
      }

      // Check required parameters
      for (const [paramName, paramSchema] of Object.entries(schema)) {
        if (!("type" in paramSchema)) continue

        if (!(paramName in params)) {
          return {
            jsonrpc: "2.0",
            error: {
              code: -32602,
              message: `Invalid params: missing required parameter "${paramName}"`,
              data: { schema, received: params },
            },
            id,
          }
        }

        // Type validation
        const paramValue = params[paramName]
        const expectedType = paramSchema[paramName].type
        const actualType = typeof paramValue

        if (expectedType && actualType !== expectedType) {
          return {
            jsonrpc: "2.0",
            error: {
              code: -32602,
              message: `Invalid params: "${paramName}" must be of type "${expectedType}"`,
              data: { expected: expectedType, received: actualType },
            },
            id,
          }
        }
      }
    }

    try {
      logger.verbose("Executing method", {
        traceId,
        plugin: pluginName,
        method: methodName,
        params,
        schema,
        format: "detailed",
      })

      const result = await handler(params)

      logger.endTrace(
        traceId,
        "RPC Request",
        {
          method,
          id,
          result,
          format: "detailed",
        },
        startTime,
      )

      return {
        jsonrpc: "2.0",
        result,
        id,
        _meta: {
          protocol,
          timestamp: new Date().toISOString(),
          serverInfo: {
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            connections: this.tcpConnections.size,
          },
        },
      }
    } catch (error) {
      const err = error as Error & { cause?: unknown }
      logger.error("Method execution failed", {
        traceId,
        method,
        error: err.message,
        stack: err.stack,
        params,
        cause: err.cause || "Unknown cause",
        format: "detailed",
      })

      return {
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: err.message,
          data: { stack: err.stack },
        },
        id,
      }
    }
  }

  // Setup TCP server
  private setupTCPServer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      logger.info("Setting up TCP server", { port: this.tcpPort })

      // Create TCP server
      this.tcpServer = net.createServer((socket: net.Socket) => {
        const clientInfo = `${socket.remoteAddress}:${socket.remotePort}`
        this.tcpConnections.add(socket)

        // Keep socket alive
        socket.setKeepAlive(true, 60000) // 60 seconds
        socket.setTimeout(0) // Disable timeout

        logger.info("TCP client connected", {
          client: clientInfo,
          totalConnections: this.tcpConnections.size,
        })

        socket.on("data", async (data: Buffer) => {
          try {
            const request = parseJSON(data) as RPCRequest
            logger.verbose("Received TCP request", {
              client: clientInfo,
              request,
            })
            const response = await this.handleRequest(request, "tcp")
            socket.write(stringifyJSON(response) + "\n") // Add newline for better parsing
            logger.verbose("Sent TCP response", { client: clientInfo, response })
          } catch (error) {
            logger.error("Failed to process TCP request", {
              client: clientInfo,
              error: (error as Error).message,
              data: data.toString(),
            })

            const errorResponse: RPCResponse = {
              jsonrpc: "2.0",
              error: {
                code: -32700,
                message: "Parse error",
                data: { received: data.toString() },
              },
              id: null,
            }
            socket.write(stringifyJSON(errorResponse) + "\n")
          }
        })

        socket.on("close", () => {
          this.tcpConnections.delete(socket)
          logger.info("TCP client disconnected", {
            client: clientInfo,
            remainingConnections: this.tcpConnections.size,
          })
        })

        socket.on("error", (err: Error) => {
          logger.error("TCP client error", {
            client: clientInfo,
            error: err.message,
            stack: err.stack,
          })
          this.tcpConnections.delete(socket)
          socket.destroy()
        })
      })

      // Handle server errors
      this.tcpServer.on("error", (error: Error & { code?: string }) => {
        if (error.code === "EADDRINUSE") {
          logger.error("TCP port is already in use", {
            port: this.tcpPort,
            error: error.message,
          })
          reject(error)
        } else {
          logger.error("TCP server error", {
            error: error.message,
            stack: error.stack,
          })
        }
      })

      // Handle server close
      this.tcpServer.on("close", () => {
        logger.info("TCP server closed")
      })

      // Bind TCP server
      this.tcpServer.listen(this.tcpPort, "0.0.0.0", () => {
        logger.info("TCP server listening", {
          port: this.tcpPort,
          pid: process.pid,
        })
        resolve(true)
      })
    })
  }

  // Setup UDP server
  private setupUDPServer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      logger.info("Setting up UDP server", { port: this.udpPort })
      this.udpServer = dgram.createSocket("udp4")

      // Handle server errors
      this.udpServer.on("error", (error: Error & { code?: string }) => {
        if (error.code === "EADDRINUSE") {
          logger.error("UDP port is already in use", {
            port: this.udpPort,
            error: error.message,
          })
          reject(error)
        } else {
          logger.error("UDP server error", {
            error: error.message,
            stack: error.stack,
          })
        }
      })

      // Handle server listening
      this.udpServer.on("listening", () => {
        const address = this.udpServer.address()
        logger.info("UDP server listening", {
          port: address.port,
          address: address.address,
          pid: process.pid,
        })
      })

      // Handle server close
      this.udpServer.on("close", () => {
        logger.info("UDP server closed")
      })

      // Handle incoming messages
      this.udpServer.on("message", async (data: Buffer, rinfo: dgram.RemoteInfo) => {
        const clientInfo = `${rinfo.address}:${rinfo.port}`
        this.requestStats.udp++
        logger.debug("Received UDP message", { client: clientInfo })

        try {
          const request = parseJSON(data) as RPCRequest
          logger.verbose("Processing UDP request", {
            client: clientInfo,
            request,
          })
          const response = await this.handleRequest(request, "udp")
          const responseBuffer = Buffer.from(stringifyJSON(response) + "\n")
          this.udpServer.send(responseBuffer.toString() as string, rinfo.port, rinfo.address)
          logger.verbose("Sent UDP response", { client: clientInfo, response })
        } catch (error) {
          logger.error("Failed to process UDP request", {
            client: clientInfo,
            error: (error as Error).message,
            data: data.toString(),
          })

          const errorResponse: RPCResponse = {
            jsonrpc: "2.0",
            error: {
              code: -32700,
              message: "Parse error",
              data: { received: data.toString() },
            },
            id: null,
          }
          const responseBuffer = Buffer.from(stringifyJSON(errorResponse) + "\n")
          this.udpServer.send(responseBuffer.toString() as string, rinfo.port, rinfo.address)
        }
      })

      // Bind UDP server
      this.udpServer.bind(this.udpPort, () => {
        resolve(true)
      })
    })
  }

  // Graceful shutdown
  public async shutdown(): Promise<void> {
    logger.info("Initiating RPC service shutdown")

    return new Promise((resolve) => {
      // Close all TCP connections
      for (const socket of this.tcpConnections) {
        socket.end()
      }

      // Close TCP server
      this.tcpServer.close(() => {
        logger.debug("TCP server closed")

        // Close UDP server
        this.udpServer.close(() => {
          logger.info("RPC service shutdown complete", {
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            totalRequests: this.requestStats,
          })
          resolve()
        })
      })
    })
  }
}
