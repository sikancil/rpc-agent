import { RPCPlugins } from "../../interfaces/rpc.interface"
import { ServerStatusResponse } from "./interfaces"

export default class ServerPlugin implements RPCPlugins {
  name = "server"
  version = "1.0"
  private startTime: number
  private tcpPort: number
  private udpPort: number
  private tcpConnections: number
  private requestStats: {
    tcp: number
    udp: number
  }

  constructor() {
    this.startTime = Date.now()
    this.tcpPort = Number(process.env.TCP_PORT) || 9101
    this.udpPort = Number(process.env.UDP_PORT) || 9102
    this.tcpConnections = 0
    this.requestStats = { tcp: 0, udp: 0 }
  }

  methods = {
    status: (): ServerStatusResponse => {
      return {
        status: "running",
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        tcpPort: this.tcpPort,
        udpPort: this.udpPort,
        tcpConnections: this.tcpConnections,
        totalRequests: { ...this.requestStats },
        timestamp: new Date().toISOString(),
      }
    },
  }
}
