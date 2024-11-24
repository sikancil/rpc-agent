import * as TCPServer from "node:net"
import * as UDPServer from "node:dgram"
import { createServer as createTCPServer } from "node:net"
import { createSocket as createUDPServer } from "node:dgram"
import { logger } from "../utils/logger"
import { Extension } from "../interfaces/extension.interface"
import { RpcRequest, RpcResponse } from "../interfaces/rpc.interface"
import { loadExtensions } from "../utils/extension-loader"
import { ErrorCode } from "../interfaces/error.interface"
import { RpcError, ErrorService } from "./error.service"
import { JSONValue } from "@/interfaces/common.interface"
// import { validateParamsToSchema } from "../utils/schema"
// import { DynamicSchema } from "@/interfaces/schema.interface"

export class RPCService {
  private tcpServer: TCPServer.Server | null = null
  private udpServer: UDPServer.Socket | null = null
  private extensions: Map<string, Extension> = new Map()
  private initialized: boolean = false

  constructor(
    private readonly tcpPort: number = 9101,
    private readonly udpPort: number = 9102,
    private readonly host: string = "127.0.0.1",
  ) {}

  async initialize(): Promise<{ tcp: boolean; udp: boolean }> {
    if (this.initialized) {
      return { tcp: !!this.tcpServer, udp: !!this.udpServer }
    }

    try {
      // Load extensions first
      await this.loadExtensions()

      // Initialize servers
      const [tcp, udp] = await Promise.all([this.initializeTCPServer(), this.initializeUDPServer()])

      this.initialized = true
      return { tcp, udp }
    } catch (error) {
      logger.error("Failed to initialize RPC service", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      await this.shutdown()
      throw error
    }
  }

  private async loadExtensions(): Promise<void> {
    try {
      const extensionsMap = await loadExtensions()
      this.extensions = extensionsMap

      // Initialize extensions manager
      const extensionsManager = Array.from(this.extensions.values()).find((ext) => ext.name === "extensions")
      if (extensionsManager && "setExtensions" in extensionsManager) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(extensionsManager as any).setExtensions(this.extensions)
      }

      // Log loaded extensions
      for (const [name, extension] of this.extensions) {
        const methodCount = Object.keys(extension.methods).length
        logger.info(`Loaded extension: ${name} with ${methodCount} methods`)
      }

      logger.info(`Successfully loaded ${this.extensions.size} extensions`)
    } catch (error) {
      logger.error("Failed to load extensions", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      // Don't throw error here, allow service to start without extensions
      logger.warning("Service will start without extensions")
    }
  }

  private registerExtension(extension: Extension): number {
    const { name, methods } = extension

    if (!name || !methods || typeof methods !== "object") {
      logger.warning(`Invalid extension format: ${name}`)
      return 0
    }

    if (this.extensions.has(name)) {
      logger.warning(`Extension '${name}' is already registered`)
      return 0
    }

    this.extensions.set(name, extension)
    let methodCount = 0

    // Register each method
    for (const [methodName, method] of Object.entries(methods)) {
      if (typeof method !== "function") {
        logger.warning(`Skipping invalid method ${name}.${methodName}: not a function`)
        continue
      }

      const fullMethodName = `${name}.${methodName}`
      logger.debug(`Registered RPC method: ${fullMethodName}`, {
        extension: name,
        method: methodName,
        hasSchema: "schema" in method,
      })
      methodCount++
    }

    logger.info(`Registered extension: ${name} with ${methodCount} methods`)
    return methodCount
  }

  private createErrorResponse(
    id: string | number | null,
    code: ErrorCode,
    message: string,
    details?: Record<string, JSONValue>,
  ): RpcResponse {
    const error = new RpcError({
      message,
      code,
      details,
      requestId: id,
    })

    return {
      jsonrpc: "2.0",
      id,
      error: error.toJSON(),
    }
  }

  private async handleRequest(request: RpcRequest): Promise<RpcResponse> {
    const { id, method, params = {} } = request
    const traceId = logger.startTrace("Handling RPC request", { method, id })

    try {
      // Parse method name (format: extension.method)
      const [extensionName, methodName] = method.split(".")
      if (!extensionName || !methodName) {
        throw ErrorService.invalidRequest("Invalid method format. Expected 'extension.method'")
      }

      // Get extension
      const extension = this.extensions.get(extensionName)
      if (!extension) {
        throw ErrorService.extensionNotFound(`Extension '${extensionName}' not found`)
      }

      // Get method
      const methodHandler = extension.methods[methodName]
      if (!methodHandler) {
        throw ErrorService.methodNotFound(`Method '${methodName}' not found in extension '${extensionName}'`)
      }

      // Validate method schema if it exists
      // if ("schema" in methodHandler && methodHandler.schema) {
      //   try {
      //     await validateParamsToSchema(params, methodHandler.schema as DynamicSchema)
      //   } catch (error) {
      //     throw ErrorService.invalidParams(
      //       error instanceof Error ? error.message : "Invalid parameters",
      //       { schema: methodHandler.schema },
      //     )
      //   }
      // }

      // Execute method with timeout
      const timeoutMs = 5000 // 5 seconds timeout
      const result = await Promise.race([
        methodHandler(params),
        new Promise((_, reject) =>
          setTimeout(() => {
            reject(
              ErrorService.requestTimeout("Request timeout", {
                requestId: id,
                method,
                timeoutMs,
              }),
            )
          }, timeoutMs),
        ),
      ])

      logger.endTrace(traceId, "RPC request completed successfully", {
        method,
        id,
        result,
      })

      return {
        jsonrpc: "2.0",
        id,
        result,
      }
    } catch (error) {
      logger.error("Error handling RPC request", {
        traceId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        method,
        params,
      })

      if (error instanceof RpcError) {
        return {
          jsonrpc: "2.0",
          id,
          error: error.toJSON(),
        }
      }

      // Convert unknown errors to internal error
      const internalError = ErrorService.internalError(error instanceof Error ? error.message : "Unknown error", {
        requestId: id,
        method,
      })

      return {
        jsonrpc: "2.0",
        id,
        error: internalError.toJSON(),
      }
    }
  }

  private async initializeTCPServer(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.tcpServer = createTCPServer({
          keepAlive: true,
          noDelay: true,
          allowHalfOpen: false,
          pauseOnConnect: false,
        })

        // Handle server-level errors
        this.tcpServer.on("error", (error) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((error as any).code === "EADDRINUSE") {
            logger.error(`TCP port ${this.tcpPort} is already in use`, {
              host: this.host,
              port: this.tcpPort,
            })
          } else {
            logger.error("TCP server error", {
              host: this.host,
              port: this.tcpPort,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            })
          }
          resolve(false)
        })

        this.tcpServer.on("connection", (socket: TCPServer.Socket) => {
          const clientId = `${socket.remoteAddress}:${socket.remotePort}`
          logger.info("New TCP connection", { clientId })

          // Set socket options
          socket.setKeepAlive(true, 1000)
          socket.setNoDelay(true)
          socket.setTimeout(10000) // 30 second timeout

          // Handle socket timeout
          socket.on("timeout", () => {
            logger.warning("TCP socket timeout", { clientId })
            this.cleanupSocket(socket /* clientId */)
          })

          let buffer = Buffer.alloc(0)
          const maxBufferSize = 1024 * 1024 // 1MB limit

          socket.on("data", async (data: Buffer) => {
            const traceId = logger.startTrace("Received TCP data", {
              clientId,
              size: data.length,
            })

            let requestId: string | number | null = null
            try {
              buffer = Buffer.concat([buffer, data])

              // Check buffer size limit
              if (buffer.length > maxBufferSize) {
                logger.error("TCP buffer size limit exceeded", {
                  clientId,
                  traceId,
                  size: buffer.length,
                })
                const errorResponse = this.createErrorResponse(
                  null,
                  ErrorCode.SERVER_ERROR,
                  "Buffer size limit exceeded",
                  { size: buffer.length, maxSize: maxBufferSize },
                )
                this.sendTCPResponse(socket, errorResponse, clientId, traceId)
                buffer = Buffer.alloc(0)
                return
              }

              // Process complete messages
              let newlineIndex
              while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
                const messageStr = buffer.slice(0, newlineIndex).toString()
                buffer = buffer.slice(newlineIndex + 1)

                try {
                  const request: RpcRequest = JSON.parse(messageStr)
                  requestId = request.id ?? null

                  // Handle request
                  const response = await this.handleRequest(request)
                  this.sendTCPResponse(socket, response, clientId, traceId)
                } catch (error) {
                  logger.error("Failed to handle TCP message", {
                    clientId,
                    traceId,
                    error: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    data: messageStr.substring(0, 1000), // Limit log size
                  })

                  const errorResponse = this.createErrorResponse(
                    requestId,
                    ErrorCode.PARSE_ERROR,
                    error instanceof Error ? error.message : "Parse error",
                    { data: messageStr.substring(0, 100) }, // Include partial data for debugging
                  )
                  this.sendTCPResponse(socket, errorResponse, clientId, traceId)
                }
              }
            } catch (error) {
              logger.error("TCP data processing error", {
                clientId,
                traceId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              })

              const errorResponse = this.createErrorResponse(
                requestId,
                error instanceof RpcError ? (error as RpcError).code : ErrorCode.INTERNAL_ERROR,
                error instanceof Error ? error.message : "Internal error",
                error instanceof RpcError ? (error as RpcError).details : undefined,
              )
              this.sendTCPResponse(socket, errorResponse, clientId, traceId)
            } finally {
              logger.endTrace(traceId, "TCP data processing completed", {
                clientId,
                size: data.length,
              })
            }
          })

          socket.on("error", (error) => {
            // Only log if it's not a connection reset
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((error as any).code !== "ECONNRESET") {
              logger.error("TCP socket error", {
                clientId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              })
            }
            this.cleanupSocket(socket)
          })

          socket.on("close", () => {
            logger.info("TCP connection closed")
            this.cleanupSocket(socket)
          })
        })

        // Listen for connections
        this.tcpServer.listen(this.tcpPort, this.host, () => {
          logger.info(`TCP server listening on ${this.host}:${this.tcpPort}`)
          resolve(true)
        })
      } catch (error) {
        logger.error("Failed to initialize TCP server", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        resolve(false)
      }
    })
  }

  private async initializeUDPServer(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      try {
        this.udpServer = createUDPServer("udp4")

        // Set socket options
        this.udpServer.on("listening", () => {
          const address = this.udpServer?.address()
          logger.info("UDP server started", {
            host: this.host,
            port: this.udpPort,
            server: address,
          })
          resolve(true)
        })

        // Handle server-level errors
        this.udpServer.on("error", (error) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((error as any).code === "EADDRINUSE") {
            logger.error(`UDP port ${this.udpPort} is already in use`, {
              host: this.host,
              port: this.udpPort,
            })
          } else {
            logger.error("UDP server error", {
              host: this.host,
              port: this.udpPort,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            })
          }
          resolve(false)
        })

        this.udpServer.on("message", async (data: Buffer, rinfo: UDPServer.RemoteInfo) => {
          const clientId = `${rinfo.address}:${rinfo.port}`
          const traceId = logger.startTrace("Received UDP message", {
            clientId,
            size: data.length,
          })

          let requestId: string | number | null = null
          try {
            if (!this.udpServer) {
              throw ErrorService.internalError("UDP server not initialized")
            }

            try {
              const messageStr = data.toString().trim()
              const request: RpcRequest = JSON.parse(messageStr)
              requestId = request.id ?? null

              // Handle request
              const response = await this.handleRequest(request)
              this.sendUDPResponse(response, rinfo, traceId)
            } catch (error) {
              logger.error("UDP message processing error", {
                clientId,
                traceId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              })

              const errorResponse = this.createErrorResponse(
                requestId,
                error instanceof RpcError ? error.code : ErrorCode.INTERNAL_ERROR,
                error instanceof Error ? error.message : "Internal error",
                error instanceof RpcError ? error.details : undefined,
              )
              this.sendUDPResponse(errorResponse, rinfo, traceId)
            }
          } catch (error) {
            logger.error("UDP request handling error", {
              clientId,
              traceId,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined,
            })
          } finally {
            logger.endTrace(traceId, "UDP message processing completed", {
              clientId,
              size: data.length,
            })
          }
        })

        // Bind server to host and port
        this.udpServer.bind(this.udpPort, this.host)
      } catch (error) {
        logger.error("Failed to initialize UDP server", {
          host: this.host,
          port: this.udpPort,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        })
        resolve(false)
      }
    })
  }

  private sendUDPResponse(response: RpcResponse, rinfo: UDPServer.RemoteInfo, traceId: string): void {
    if (this.udpServer) {
      const responseStr = JSON.stringify(response) + "\n"
      this.udpServer.send(responseStr, rinfo.port, rinfo.address, (error) => {
        if (error) {
          logger.error("Failed to send UDP response", {
            clientId: `${rinfo.address}:${rinfo.port}`,
            traceId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          })
        } else {
          logger.debug("UDP response sent successfully", {
            clientId: `${rinfo.address}:${rinfo.port}`,
            traceId,
            size: responseStr.length,
          })
        }
      })
    }
  }

  private cleanupSocket(socket: TCPServer.Socket): void {
    // Clean up any pending requests for this client
    // for (const [queueId, { reject }] of this.requestQueue.entries()) {
    //   if (queueId.startsWith(clientId)) {
    //     reject(new Error("Connection closed"))
    //     this.requestQueue.delete(queueId)
    //   }
    // }

    if (!socket.destroyed) {
      socket.end()
      socket.destroy()
    }
  }

  private sendTCPResponse(socket: TCPServer.Socket, response: RpcResponse, clientId: string, traceId: string): void {
    if (!socket.destroyed) {
      const responseStr = JSON.stringify(response) + "\n"
      socket.write(responseStr, (error) => {
        if (error) {
          logger.error("Failed to send TCP response", {
            clientId,
            traceId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          })
        } else {
          logger.debug("TCP response sent successfully", {
            clientId,
            traceId,
            size: responseStr.length,
          })
        }
      })
    }
  }

  async shutdown(): Promise<void> {
    logger.info("Shutting down RPC service")

    if (this.tcpServer) {
      await new Promise<void>((resolve) => {
        this.tcpServer?.close(() => {
          logger.info("TCP server closed")
          resolve()
        })
      })
    }

    if (this.udpServer) {
      await new Promise<void>((resolve) => {
        this.udpServer?.close(() => {
          logger.info("UDP server closed")
          resolve()
        })
      })
    }

    this.initialized = false
    this.tcpServer = null
    this.udpServer = null
  }
}
