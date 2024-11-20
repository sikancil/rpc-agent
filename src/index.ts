import { RPCService } from "./services/rpc.service"
import { logger } from "./utils/logger"

class AgentService {
  private rpcService: RPCService
  private isShuttingDown: boolean = false

  constructor() {
    try {
      const tcpPort = Number(process.env.TCP_PORT) || 9101
      const udpPort = Number(process.env.UDP_PORT) || 9102

      logger.info("Starting RPC Agent Service", { tcpPort, udpPort })

      // Initialize RPC service
      this.rpcService = new RPCService(tcpPort, udpPort)
      this.setupMethods()
      this.setupSignalHandlers()
      logger.info("RPC Agent Service started successfully", {
        tcpPort,
        udpPort,
        pid: process.pid,
      })
    } catch (error) {
      logger.error("Failed to start RPC Agent Service", {
        error: (error as Error).message,
        stack: (error as Error).stack,
      })
      process.exit(1)
    }
  }

  async initialize(): Promise<{ tcp: boolean; udp: boolean }> {
    // Initialize the service and wait for servers to be ready
    const checkIsReady = await this.rpcService.initialize()
    const servicesIsReady = {
      tcp: checkIsReady[0],
      udp: checkIsReady[1],
    }
    return servicesIsReady
  }

  private setupMethods(): void {
    logger.info("Registering RPC methods")

    // Methods are now loaded automatically from plugins
    logger.info("RPC methods initialized via plugin system")
  }

  private setupSignalHandlers(): void {
    // Handle uncaught exceptions
    process.on("uncaughtException", async (error: Error) => {
      logger.error("Uncaught exception", {
        error: error.message,
        stack: error.stack,
      })
      await this.shutdown(1)
    })

    // Handle unhandled promise rejections
    process.on("unhandledRejection", async (reason: any) => {
      logger.error("Unhandled rejection", {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
      })
      await this.shutdown(1)
    })

    // Handle process warnings
    process.on("warning", (warning: Error) => {
      logger.warning("Process warning", {
        name: warning.name,
        message: warning.message,
        stack: warning.stack,
      })
    })

    // Log startup
    logger.info("Signal handlers initialized")
  }

  async shutdown(exitCode: number = 0): Promise<void> {
    if (this.isShuttingDown) {
      logger.debug("Shutdown already in progress")
      return
    }

    this.isShuttingDown = true
    logger.info("Initiating graceful shutdown")

    try {
      // Shutdown RPC service
      await this.rpcService.shutdown()
      logger.info("Shutdown completed successfully")
    } catch (error) {
      logger.error("Error during shutdown", {
        error: (error as Error).message,
        stack: (error as Error).stack,
      })
      exitCode = 1
    }

    // Exit process
    process.exit(exitCode)
  }
}

// Export for testing
export { AgentService }

// Initialize and run the service
async function main() {
  let isShuttingDown = false
  const service = new AgentService()

  try {
    // Initialize the service and wait for servers to be ready
    const servicesIsReady = await service.initialize()

    // Log service status
    logger.info("Service is ready", servicesIsReady)

    // Set up monitoring intervals
    const heartbeatInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage()
      logger.verbose("Service heartbeat", {
        uptime: process.uptime(),
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + "MB",
        },
        pid: process.pid,
      })
    }, 60000)

    // Interactive mode
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true)
      process.stdin.setEncoding("utf8")
      process.stdin.resume()

      process.stdin.on("data", async (key: string) => {
        if (key === "\u0003" || key.toLowerCase() === "q") {
          if (!isShuttingDown) {
            isShuttingDown = true
            logger.info("Received shutdown command")
            clearInterval(heartbeatInterval)
            await service.shutdown()
            process.exit(0)
          }
        } else if (key === "h" || key === "?") {
          console.log("\nAvailable commands:")
          console.log("  Ctrl+C or 'q' : Shutdown service")
          console.log("  h or ?        : Show this help menu")
          console.log("  s             : Show service status")
          console.log("  m             : Show memory usage\n")
        } else if (key.toLowerCase() === "s") {
          console.log("\nService Status:")
          console.log(`  Uptime: ${process.uptime().toFixed(2)} seconds`)
          console.log(`  PID: ${process.pid}`)
          console.log(`  Environment: ${process.env.NODE_ENV}`)
        } else if (key.toLowerCase() === "m") {
          const memory = process.memoryUsage()
          console.log("\nMemory Usage:")
          Object.entries(memory).forEach(([key, value]) => {
            console.log(`  ${key}: ${Math.round(value / 1024 / 1024)}MB`)
          })
          console.log("")
        }
      })
    }

    // Set up signal handlers for graceful shutdown
    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"]
    signals.forEach((signal) => {
      process.on(signal, async () => {
        if (!isShuttingDown) {
          isShuttingDown = true
          logger.info(`Received ${signal} signal`)
          clearInterval(heartbeatInterval)
          await service.shutdown()
          process.exit(0)
        }
      })
    })

    // // Keep the process running indefinitely
    // await new Promise<void>((resolve) => {
    //   // This promise intentionally never resolves
    //   // The service will only exit through the signal handlers
    // })
  } catch (error) {
    if ((error as any)?.code === "EADDRINUSE") {
      console.error(`❌ ${(error as Error).message}`, {
        listen: `${(error as any).address}:${(error as any).port}`,
        stack: (error as Error).stack,
      })
      process.exit(1)
    }

    logger.error("Fatal error in service", { error })
    process.exit(1)
  }
}

// Run the service
main().catch((error) => {
  logger.error("Unhandled error in main", { error })
  process.exit(1)
})
