import * as net from "node:net"
import * as dgram from "node:dgram"

export interface JsonRpcRequest {
  jsonrpc: "2.0"
  method: string
  params: any
  id: string
}

export interface RpcClientConfig {
  host: string
  tcpPort: number
  udpPort: number
  timeout?: number
  debug?: boolean
  debugLevel?: number
}

export class RpcClient {
  private config: RpcClientConfig
  private availablePlugins: Set<string> = new Set(["echo"])

  constructor(config: RpcClientConfig) {
    this.config = {
      timeout: 5000,
      debug: false,
      debugLevel: 0,
      ...config,
    }
  }

  async sendTcpRequest(method: string, params: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket()
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        method,
        params,
        id: Date.now().toString(),
      }

      const timeout = setTimeout(() => {
        client.destroy()
        reject(new Error(`TCP request timed out after ${this.config.timeout}ms`))
      }, this.config.timeout)

      client.connect(this.config.tcpPort, this.config.host, () => {
        if (this.config.debug) {
          console.log(`Connected to TCP server at ${this.config.host}:${this.config.tcpPort}`)
        }
        client.write(JSON.stringify(request) + "\n")
      })

      let data = ""
      client.on("data", (chunk) => {
        data += chunk
        if (data.includes("\n")) {
          clearTimeout(timeout)
          client.destroy()
          resolve(data.trim())
        }
      })

      client.on("error", (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  async sendUdpRequest(method: string, params: any): Promise<string> {
    return new Promise((resolve, reject) => {
      const client = dgram.createSocket("udp4")
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        method,
        params,
        id: Date.now().toString(),
      }

      const timeout = setTimeout(() => {
        client.close()
        reject(new Error(`UDP request timed out after ${this.config.timeout}ms`))
      }, this.config.timeout)

      const message = Buffer.from(JSON.stringify(request))
      client.send(message, this.config.udpPort, this.config.host, (error) => {
        if (error) {
          clearTimeout(timeout)
          client.close()
          reject(error)
        }
      })

      client.on("message", (msg) => {
        clearTimeout(timeout)
        client.close()
        resolve(msg.toString().trim())
      })

      client.on("error", (error) => {
        clearTimeout(timeout)
        client.close()
        reject(error)
      })
    })
  }

  async getAvailablePlugins(protocol: "tcp" | "udp"): Promise<string[]> {
    try {
      const response = await (protocol === "tcp"
        ? this.sendTcpRequest("system.list_plugins", {})
        : this.sendUdpRequest("system.list_plugins", {}))
      const result = JSON.parse(response)
      if (result.result) {
        this.availablePlugins = new Set(result.result)
        return Array.from(this.availablePlugins)
      }
      return Array.from(this.availablePlugins)
    } catch (error) {
      console.error(`Failed to get available plugins: ${error}`)
      return Array.from(this.availablePlugins)
    }
  }

  isPluginAvailable(plugin: string): boolean {
    return this.availablePlugins.has(plugin)
  }
}
