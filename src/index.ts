import { RPCService } from "./services/rpc.service"
import { RpcClient } from "./client/library/client.node"
import { logger } from "./utils/logger"
import { RpcClientConfig } from "./client/library/interfaces"

export { RpcClientConfig } from "./client/library/interfaces"

class AgentService {
  private rpcService: RPCService
  private isShuttingDown: boolean = false

  public readonly extensionPath: string | undefined

  constructor(extensionPath: string | undefined = undefined, tcpPort?: number, udpPort?: number) {
    this.extensionPath = extensionPath

    const _tcpPort = Number(process.env.PORT_TCP) || tcpPort || 9101
    const _udpPort = Number(process.env.PORT_UDP) || udpPort || 9102

    logger.info("Starting RPC Agent Service", { tcpPort: _tcpPort, udpPort: _udpPort })

    // Initialize RPC service
    this.rpcService = new RPCService(this.extensionPath, _tcpPort, _udpPort)
    this.setupSignalHandlers()
  }

  private setupSignalHandlers(): void {
    process.on("SIGTERM", () => this.shutdown())
    process.on("SIGINT", () => this.shutdown())
    logger.info("Signal handlers initialized")
  }

  async start(): Promise<{ tcp: boolean; udp: boolean }> {
    try {
      // Initialize RPC service (includes extension loading)
      const { tcp, udp } = await this.rpcService.initialize()

      logger.info("Agent service initialized successfully", {
        tcp,
        udp,
      })

      return { tcp, udp }
    } catch (error) {
      logger.error("Failed to initialize RPC service", {
        error: (error as Error).message,
        stack: error instanceof Error ? error.stack : undefined,
      })
      return {
        tcp: false,
        udp: false,
      }
    }
  }

  private async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return
    }

    this.isShuttingDown = true
    logger.info("Shutting down RPC Agent Service")

    try {
      await this.rpcService.shutdown()
      logger.info("RPC Agent Service shutdown complete")
      process.exit(0)
    } catch (error) {
      logger.error("Error during shutdown", {
        error: (error as Error).message,
        stack: error instanceof Error ? error.stack : undefined,
      })
      process.exit(1)
    }
  }
}

class AgentClient {
  public readonly client: RpcClient

  constructor(config: RpcClientConfig, debug: boolean = false) {
    this.client = new RpcClient(config, debug)
  }

  async init(): Promise<void> {
    await this.client.init()
  }

  send<T>(method: string, params: Record<string, unknown>): Promise<T> {
    return this.client.send(method, params)
  }

  close(): void {
    this.client.close()
  }
}

// Export for testing
export { AgentService, AgentClient }

// If executed directly, run the service
if (require.main === module) {
  async function listen(extensionsPath: string | undefined = undefined): Promise<void> {
    try {
      const service = new AgentService(
        extensionsPath,
        Number(process.env.PORT_TCP || "9101") || 9101,
        Number(process.env.PORT_UDP || "9102") || 9102,
      )
      await service.start()
    } catch (error) {
      logger.error("Failed to start RPC Agent Service", {
        error: (error as Error).message,
        stack: error instanceof Error ? error.stack : undefined,
      })
      process.exit(1)
    }
  }

  listen().catch((error: unknown) => {
    logger.error("Unhandled error in main", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    process.exit(1)
  })
}
