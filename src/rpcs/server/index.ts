import * as os from "os"
import {
  Extension,
  ExtensionConfig,
  ExtensionMetadata,
  ExtensionStatus,
  ExtensionMethod,
} from "../../interfaces/extension.interface"

import { SystemInfo, ProcessInfo } from "./interfaces"

export default class ServerExtension implements Extension {
  name = "server"
  status: ExtensionStatus = "active" as const
  config: ExtensionConfig = { enabled: true }
  metadata: ExtensionMetadata = {
    name: this.name,
    version: "1.0.0",
    description: "Server monitoring and management",
  }

  private startTime = Date.now()

  methods: Record<string, ExtensionMethod> = {
    system: async (): Promise<SystemInfo> => {
      const cpus = os.cpus()
      const totalMem = os.totalmem()
      const freeMem = os.freemem()

      return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: cpus.map((cpu) => ({
          model: cpu.model,
          speed: cpu.speed,
          times: cpu.times,
        })),
        memory: {
          total: totalMem,
          free: freeMem,
          used: totalMem - freeMem,
        },
        uptime: os.uptime(),
        loadavg: os.loadavg(),
      }
    },

    process: async (): Promise<ProcessInfo> => {
      const mem = process.memoryUsage()
      const cpu = process.cpuUsage()

      return {
        pid: process.pid,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        memory: {
          rss: mem.rss,
          heapTotal: mem.heapTotal,
          heapUsed: mem.heapUsed,
          external: mem.external,
        },
        cpu: {
          user: cpu.user,
          system: cpu.system,
        },
      }
    },
  }
}
