import { Extension, ExtensionConfig, ExtensionMetadata, ExtensionStatus, ExtensionMethod } from "../../interfaces"
import { ValidatePortArguments, ValidatePortResponse } from "./interfaces"

export default class NetworkExtension implements Extension {
  name = "network"
  status: ExtensionStatus = "active" as const
  config: ExtensionConfig = { enabled: true }
  metadata: ExtensionMetadata = {
    name: this.name,
    version: "1.0.0",
    description: "Network utilities extension",
  }

  methods: Record<string, ExtensionMethod> = {
    validatePort: async (params: ValidatePortArguments): Promise<ValidatePortResponse> => {
      const { port, type } = params

      // Validate port number
      if (!Number.isInteger(port)) {
        throw new Error(`Invalid ${type} port: ${port}. Port must be an integer.`)
      }
      if (port < 1 || port > 65535) {
        throw new Error(`Invalid ${type} port: ${port}. Port must be between 1 and 65535.`)
      }

      return {
        valid: true,
        port: port,
        type: type,
      }
    },
  }
}
