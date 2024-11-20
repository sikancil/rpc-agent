export interface ServerStatusResponse {
  status: string
  uptime: number
  tcpPort: number
  udpPort: number
  tcpConnections: number
  totalRequests: {
    tcp: number
    udp: number
  }
  timestamp: string
}
