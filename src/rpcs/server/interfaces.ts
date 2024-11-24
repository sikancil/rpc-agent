export interface SystemInfo {
  hostname: string
  platform: string
  arch: string
  cpus: {
    model: string
    speed: number
    times: {
      user: number
      nice: number
      sys: number
      idle: number
      irq: number
    }
  }[]
  memory: {
    total: number
    free: number
    used: number
  }
  uptime: number
  loadavg: number[]
}

export interface ProcessInfo {
  pid: number
  uptime: number
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  cpu: {
    user: number
    system: number
  }
}
