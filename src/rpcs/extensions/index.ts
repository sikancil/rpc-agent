import {
  Extension,
  ExtensionConfig,
  ExtensionMetadata,
  ExtensionStatus,
  ExtensionMethod,
} from "../../interfaces/extension.interface"
import { ListExtensionsResponse, StatusResponse } from "./interfaces"

export default class ExtensionsManager implements Extension {
  readonly name = "extensions" as const
  readonly status: ExtensionStatus = "active" as const
  readonly config: ExtensionConfig = { enabled: true }
  readonly metadata: ExtensionMetadata = {
    name: this.name,
    version: "1.0.0",
    description: "Manages RPC extensions and their lifecycle",
  }
  private readonly startTime: number
  private extensions: Map<string, Extension> = new Map()

  constructor() {
    this.startTime = Date.now()
  }

  public setExtensions(extensions: Map<string, Extension>): void {
    this.extensions = extensions
  }

  public readonly methods: Record<string, ExtensionMethod> = {
    list: async (): Promise<ListExtensionsResponse> => {
      const extensions = Array.from(this.extensions.values()).map((extension) => ({
        name: extension.name,
        status: extension.status,
        metadata: extension.metadata,
      }))

      return {
        extensions: extensions,
        total: extensions.length,
      }
    },

    status: async (params: { name: string }): Promise<StatusResponse> => {
      const extension = this.extensions.get(params.name)
      if (!extension) {
        throw new Error(`Extension '${params.name}' not found`)
      }

      return {
        name: extension.name,
        status: extension.status,
        metadata: extension.metadata,
        methods: Object.keys(extension.methods),
        uptime: Date.now() - this.startTime,
      }
    },

    register: async (params: { extension: Extension }): Promise<void> => {
      const { extension } = params
      if (this.extensions.has(extension.name)) {
        throw new Error(`Extension '${extension.name}' already registered`)
      }

      this.extensions.set(extension.name, extension)
    },
  }

  registerExtension(extension: Extension): void {
    if (this.extensions.has(extension.name)) {
      throw new Error(`Extension '${extension.name}' already registered`)
    }
    this.extensions.set(extension.name, extension)
  }
}
