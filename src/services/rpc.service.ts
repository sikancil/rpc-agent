/**
 * Core RPC Service for handling remote procedure calls over TCP and UDP
 * @packageDocumentation
 */

import * as TCPServer from "node:net"
import * as UDPServer from "node:dgram"
import { createServer as createTCPServer } from "node:net"
import { createSocket as createUDPServer } from "node:dgram"
import { ErrorCode, RpcRequest, RpcResponse, Extension, JSONValue } from "../interfaces"
import { logger } from "../utils/logger"
import { loadExtensions } from "../utils/extension-loader"
import { RpcError, ErrorService } from "./error.service"

/**
 * RPC Service - Core service for handling RPC communications
 * @class RPCService
 *
 * @description
 * Manages RPC (Remote Procedure Call) communications over TCP and UDP protocols.
 * Handles extension loading, method invocation, and protocol-specific implementations.
 *
 * @example
 * ```typescript
 * const rpcService = new RPCService()
 * await rpcService.initialize()
 * ```
 *
 * @architecture
 * - TCP Server: Reliable, connection-oriented communication
 * - UDP Server: Fast, connectionless communication
 * - Extension System: Pluggable RPC method implementations
 * - Dynamic Method Resolution: Runtime method discovery and invocation
 */
export class RPCService {
  private tcpServer: TCPServer.Server | null = null
  private udpServer: UDPServer.Socket | null = null
  private extensions: Map<string, Extension> = new Map()
  private initialized: boolean = false

  /**
   * Creates a new RPC Service instance
   * @param extensionPath - Optional path to load extensions from
   * @param tcpPort - TCP port number (default: 9101)
   * @param udpPort - UDP port number (default: 9102)
   *
   * @tips
   * - Use different ports for TCP and UDP
   * - Ensure ports are available before starting
   * - Consider security implications of port choices
   */
  constructor(
    private readonly extensionPath: string | undefined,
    private readonly tcpPort: number = 9101,
    private readonly udpPort: number = 9102,
    private readonly host: string = "127.0.0.1",
  ) {}

  /**
   * Initialize the RPC service
   * @returns Promise<{tcp: boolean, udp: boolean}> - Status of TCP and UDP servers
   *
   * @workflow
   * 1. Load extensions from specified path
   * 2. Initialize TCP server
   * 3. Initialize UDP server
   * 4. Register extension methods
   *
   * @integration
   * - Works with ExtensionLoader for dynamic loading
   * - Integrates with both TCP and UDP protocols
   * - Supports multiple concurrent clients
   *
   * @error-handling
   * - Graceful server initialization failures
   * - Extension loading error recovery
   * - Port binding conflict resolution
   */
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

  /**
   * Load and register extensions
   * @returns Promise<void>
   *
   * @workflow
   * 1. Load extensions from path
   * 2. Validate extension format
   * 3. Register extension methods
   * 4. Initialize extension state
   *
   * @integration
   * - Uses ExtensionLoader
   * - Supports dynamic loading
   * - Validates extension interfaces
   *
   * @error-handling
   * - Invalid extension format
   * - Method registration conflicts
   * - Extension initialization failures
   */
  private async loadExtensions(): Promise<void> {
    try {
      const extensionsMap = await loadExtensions(this.extensionPath)
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

  /**
   * Create standardized error response
   * @param id - Request ID
   * @param code - Error code
   * @param message - Error message
   * @param details - Optional error details
   * @returns RpcResponse - Formatted error response
   *
   * @error-codes
   * - -32700: Parse error
   * - -32600: Invalid request
   * - -32601: Method not found
   * - -32602: Invalid params
   * - -32603: Internal error
   *
   * @format
   * {
   *   jsonrpc: "2.0",
   *   id: string | number | null,
   *   error: {
   *     code: number,
   *     message: string,
   *     details?: object
   *   }
   * }
   *
   * @best-practices
   * - Use standard error codes when possible
   * - Include helpful error messages
   * - Add context in details
   * - Sanitize sensitive information
   */
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

  /**
   * Handle incoming RPC request
   * @param request - RPC request object
   * @returns Promise<RpcResponse> - RPC response
   *
   * @workflow
   * 1. Validate request format
   * 2. Parse method and parameters
   * 3. Execute requested method
   * 4. Handle errors and responses
   *
   * @validation
   * - JSON-RPC 2.0 format
   * - Required fields presence
   * - Method existence
   * - Parameter types
   *
   * @error-handling
   * - Invalid request format (-32600)
   * - Method not found (-32601)
   * - Invalid parameters (-32602)
   * - Internal errors (-32603)
   * - Custom error codes
   *
   * @performance
   * - Async execution
   * - Error recovery
   * - Resource cleanup
   */
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

  /**
   * Initialize TCP server
   * @returns Promise<boolean> - Server initialization status
   *
   * @workflow
   * 1. Create TCP server
   * 2. Set up event handlers
   * 3. Bind to specified port
   * 4. Handle incoming connections
   *
   * @integration
   * - Supports JSON-RPC protocol
   * - Handles multiple client connections
   * - Provides reliable delivery
   *
   * @error-handling
   * - Connection errors
   * - Data parsing errors
   * - Client disconnections
   */
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
            this.cleanupSocket(socket)
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

  /**
   * Initialize UDP server
   * @returns Promise<boolean> - Server initialization status
   *
   * @workflow
   * 1. Create UDP socket
   * 2. Set up message handlers
   * 3. Bind to specified port
   * 4. Handle incoming datagrams
   *
   * @integration
   * - Supports JSON-RPC protocol
   * - Handles connectionless communication
   * - Provides fast message delivery
   *
   * @performance
   * - Low latency
   * - No connection overhead
   * - Suitable for real-time data
   */
  private async initializeUDPServer(): Promise<boolean> {
    return new Promise((resolve) => {
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

  /**
   * Send UDP response
   * @param response - RPC response object
   * @param rinfo - Remote info
   * @param traceId - Trace ID
   *
   * @workflow
   * 1. Serialize response to JSON
   * 2. Send response over UDP
   *
   * @integration
   * - Works with UDP protocol
   * - Supports JSON-RPC responses
   *
   * @error-handling
   * - Serialization errors
   * - UDP send errors
   */
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

  /**
   * Cleanup socket
   * @param socket - TCP socket
   *
   * @workflow
   * 1. End socket
   * 2. Destroy socket
   *
   * @integration
   * - Works with TCP protocol
   * - Supports socket cleanup
   *
   * @error-handling
   * - Socket end errors
   * - Socket destroy errors
   */
  private cleanupSocket(socket: TCPServer.Socket): void {
    if (!socket.destroyed) {
      socket.end()
      socket.destroy()
    }
  }

  /**
   * Send TCP response
   * @param socket - TCP socket
   * @param response - RPC response object
   * @param clientId - Client ID
   * @param traceId - Trace ID
   *
   * @workflow
   * 1. Serialize response to JSON
   * 2. Send response over TCP
   *
   * @integration
   * - Works with TCP protocol
   * - Supports JSON-RPC responses
   *
   * @error-handling
   * - Serialization errors
   * - TCP send errors
   */
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

  /**
   * Shutdown RPC service
   * @returns Promise<void>
   *
   * @workflow
   * 1. Close TCP server
   * 2. Close UDP socket
   * 3. Cleanup extensions
   * 4. Release resources
   *
   * @integration
   * - Graceful connection termination
   * - Resource cleanup
   * - State persistence if needed
   *
   * @error-handling
   * - Server close failures
   * - Resource cleanup errors
   * - Extension shutdown errors
   */
  async shutdown(timeoutMs: number = 5000): Promise<void> {
    logger.info("Shutting down RPC service")

    try {
      await new Promise<boolean>((resolve, reject) => {
        const tcpShutdown = {
          done: false,
          waiting: false,
        }
        const udpShutdown = {
          done: false,
          waiting: false,
        }
        let _n: number = 0
        let _to: NodeJS.Timeout | undefined = setTimeout(() => {
          // clearInterval(ti)
          if (!tcpShutdown.done && !tcpShutdown.waiting) {
            this.tcpServer?.close(() => {
              logger.info("TCP server closed")
              tcpShutdown.done = true
              tcpShutdown.waiting = false
            })
          }
          if (!udpShutdown.done && !udpShutdown.waiting) {
            this.udpServer?.close(() => {
              logger.info("UDP server closed")
              udpShutdown.done = true
              udpShutdown.waiting = false
            })
          }

          if (tcpShutdown.done && !tcpShutdown.waiting && udpShutdown.done && !udpShutdown.waiting) {
            clearTimeout(_to)
            _to = undefined
            resolve(true)
          }
          
          _n++
          if (_n >= 5) {
            clearTimeout(_to)
            _to = undefined
            reject(new Error("Shutdown timeout"))
          }
        }, timeoutMs)
      })

      this.initialized = false
      this.tcpServer = null
      this.udpServer = null

      process.exit(0)
    } catch (error) {
      logger.error("Shutdown failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      process.exit(1)
    }

    // if (this.tcpServer) {
    //   await new Promise<void>((resolve) => {
    //     this.tcpServer?.close(() => {
    //       logger.info("TCP server closed")
    //       resolve()
    //     })
    //   })
    // }

    // if (this.udpServer) {
    //   await new Promise<void>((resolve) => {
    //     this.udpServer?.close(() => {
    //       logger.info("UDP server closed")
    //       resolve()
    //     })
    //   })
    // }
  }
}
