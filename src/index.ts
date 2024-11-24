import { RPCService } from "./services/rpc.service"
import { logger } from "./utils/logger"

class AgentService {
  private rpcService: RPCService
  private isShuttingDown: boolean = false

  constructor() {
    const tcpPort = Number(process.env.TCP_PORT) || 9101
    const udpPort = Number(process.env.UDP_PORT) || 9102

    logger.info("Starting RPC Agent Service", { tcpPort, udpPort })

    // Initialize RPC service
    this.rpcService = new RPCService(tcpPort, udpPort)
    this.setupSignalHandlers()
  }

  private setupSignalHandlers(): void {
    process.on("SIGTERM", () => this.shutdown())
    process.on("SIGINT", () => this.shutdown())
    logger.info("Signal handlers initialized")
  }

  async initialize(): Promise<{ tcp: boolean; udp: boolean }> {
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

// Export for testing
export { AgentService }

export async function listen(): Promise<void> {
  try {
    const service = new AgentService()
    await service.initialize()
  } catch (error) {
    logger.error("Failed to start RPC Agent Service", {
      error: (error as Error).message,
      stack: error instanceof Error ? error.stack : undefined,
    })
    process.exit(1)
  }
}

// If executed directly, run the service
if (require.main === module) {
  listen().catch((error: unknown) => {
    logger.error("Unhandled error in main", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    process.exit(1)
  })
}
