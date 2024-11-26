import { AgentLibrary } from "../../library/client.node"
import {
  AgentEchoResponse,
  AgentDateInfo,
  AgentSystemInfo,
  AgentExtensionStatus,
  AgentPortValidationResult,
} from "../../library/interfaces"

async function makeRandomRequest(client: AgentLibrary): Promise<void> {
  const methods = [
    async (): Promise<AgentEchoResponse> => await client.echo("Hello RPC!"),
    async (): Promise<AgentDateInfo> => await client.getCurrentDate(),
    async (): Promise<AgentSystemInfo> => await client.getServerInfo(),
    async (): Promise<AgentExtensionStatus[]> => await client.listExtensions(),
    async (): Promise<AgentPortValidationResult> =>
      await client.validatePort(8080, Math.random() > 0.5 ? "TCP" : "UDP"),
  ]

  const randomMethod = methods[Math.floor(Math.random() * methods.length)]
  try {
    const result = await randomMethod()
    console.log("Random request result:", result)
  } catch (error) {
    console.error("Random request failed:", error)
  }
}

async function runRandomTests(): Promise<void> {
  const protocols: Array<"tcp" | "udp"> = ["tcp", "udp"]
  let requestCount = 0
  const maxRequests = 12 // 60 seconds / 5 seconds = 12 requests
  const startTime = Date.now()

  console.log("\n=== Running Random Protocol Tests ===")

  const interval = setInterval(async () => {
    if (requestCount >= maxRequests || Date.now() - startTime >= 60000) {
      clearInterval(interval)
      return
    }

    const randomProtocol = protocols[Math.floor(Math.random() * protocols.length)]
    console.log(`\n[Request ${requestCount + 1}] Using ${randomProtocol.toUpperCase()} protocol`)

    const client = new AgentLibrary(
      {
        host: "127.0.0.1",
        port: 9101,
        udpPort: 9102,
        protocol: randomProtocol,
      },
      true,
    )

    try {
      await client.init()
      await makeRandomRequest(client)
    } catch (error) {
      console.error(`Test failed with ${randomProtocol.toUpperCase()}:`, error)
    } finally {
      await client.close()
      requestCount++

      if (requestCount >= maxRequests) {
        console.log("\nCompleted all random protocol tests!")
        clearInterval(interval)
      }
    }
  }, 5000)

  // Wait for all tests to complete
  await new Promise((resolve) => setTimeout(resolve, 61000))
}

async function runTests(protocol: "tcp" | "udp"): Promise<void> {
  console.log(`\n=== Running ${protocol.toUpperCase()} Tests ===`)

  const client = new AgentLibrary(
    {
      host: "127.0.0.1",
      port: 9101,
      udpPort: 9102,
      protocol,
    },
    true,
  )

  try {
    // Initialize the client
    await client.init()
    console.log(`${protocol.toUpperCase()} client initialized successfully`)

    // Test echo extension first as it's simplest
    console.log(`\nTesting echo extension (${protocol.toUpperCase()})`)
    const echoResult = await client.echo("Hello RPC!")
    console.log("Echo result:", echoResult)

    // Test date extension
    console.log(`\nTesting date extension (${protocol.toUpperCase()})`)
    const dateResult = await client.getCurrentDate()
    console.log("Current date:", dateResult)

    // Test server information
    console.log(`\nTesting server information (${protocol.toUpperCase()})`)
    const serverInfo = await client.getServerInfo()
    console.log("Server info:", serverInfo)

    // Test extension management
    console.log(`\nTesting extension management (${protocol.toUpperCase()})`)
    const extensions = await client.listExtensions()
    console.log("Available extensions:", extensions)

    // Test port validation
    console.log(`\nTesting port validation (${protocol.toUpperCase()})`)
    const portValidation = await client.validatePort(8080, protocol === "tcp" ? "TCP" : "UDP")
    console.log("Port validation result:", portValidation)

    console.log(`\n${protocol.toUpperCase()} tests completed successfully`)
  } catch (error) {
    console.error(`${protocol.toUpperCase()} test failed:`, error)
    throw error
  } finally {
    // Clean up resources
    await client.close()
    // Add small delay after cleanup
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
}

async function main(): Promise<void> {
  console.log("Starting test suite...")

  try {
    // Run TCP tests first
    await runTests("tcp")

    // Add delay between protocol tests to ensure proper cleanup
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Then run UDP tests
    await runTests("udp")

    // Finally run random protocol tests
    await runRandomTests()

    console.log("\nAll tests completed successfully!")
  } catch (error) {
    console.error("\nTest suite failed:", error)
    process.exit(1)
  }
}

// Start tests
main().catch((error) => {
  console.error("Test suite failed:", error)
  process.exit(1)
})
