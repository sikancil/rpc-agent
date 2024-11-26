import { Extension, ExtensionConfig, ExtensionMetadata, ExtensionStatus, ExtensionMethod } from "../../interfaces"
import { ListExtensionsResponse, StatusResponse } from "./interfaces"

/**
 * ExtensionsManager class
 *
 * Responsible for managing RPC extensions and their lifecycle.
 * This class implements the Extension interface and provides methods
 * for listing, retrieving status, and registering extensions.
 *
 * @remarks
 * - Maintains a map of registered extensions
 * - Provides both public methods and RPC-compatible methods
 * - Handles extension conflicts and validation
 */
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

  /**
   * Sets the extensions map for the manager
   * @param extensions - Map of extension names to Extension objects
   */
  public setExtensions(extensions: Map<string, Extension>): void {
    this.extensions = extensions
  }

  /**
   * RPC-compatible methods for extension management
   */
  public readonly methods: Record<string, ExtensionMethod> = {
    /**
     * Lists all registered extensions
     * @returns Promise<ListExtensionsResponse> - List of extensions and total count
     *
     * @remarks
     * - Provides a summary of all registered extensions
     * - Useful for extension discovery and status overview
     */
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

    /**
     * Retrieves status of a specific extension
     * @param params - Object containing the name of the extension
     * @returns Promise<StatusResponse> - Detailed status of the extension
     * @throws Error if extension is not found
     *
     * @remarks
     * - Provides detailed information about a specific extension
     * - Includes uptime calculation
     */
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

    /**
     * Registers a new extension
     * @param params - Object containing the extension to register
     * @throws Error if extension is already registered
     *
     * @remarks
     * - Ensures no duplicate extensions are registered
     * - Thread-safe registration process
     */
    register: async (params: { extension: Extension }): Promise<void> => {
      const { extension } = params
      if (this.extensions.has(extension.name)) {
        throw new Error(`Extension '${extension.name}' already registered`)
      }

      this.extensions.set(extension.name, extension)
    },
  }

  /**
   * Registers a new extension
   * @param extension - The extension to register
   * @throws Error if extension is already registered
   *
   * @remarks
   * - Public method for programmatic extension registration
   * - Performs the same checks as the RPC-compatible register method
   */
  registerExtension(extension: Extension): void {
    if (this.extensions.has(extension.name)) {
      throw new Error(`Extension '${extension.name}' already registered`)
    }
    this.extensions.set(extension.name, extension)
  }
}
