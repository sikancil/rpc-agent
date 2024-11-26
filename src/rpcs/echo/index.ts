import { Extension, ExtensionConfig, ExtensionMetadata, ExtensionStatus, ExtensionMethod } from "../../interfaces"
import { ErrorService } from "../../services/error.service"
import { EchoArguments, EchoResponse, PingResponse } from "./interfaces"

export default class EchoExtension implements Extension {
  readonly name = "echo" as const
  readonly status: ExtensionStatus = "active" as const
  readonly config: ExtensionConfig = { enabled: true }
  readonly metadata: ExtensionMetadata = {
    name: this.name,
    version: "1.0.0",
    description: "Simple echo service for testing",
  } as const

  methods: Record<string, ExtensionMethod> = {
    echo: async (params: EchoArguments): Promise<EchoResponse> => {
      if (!this.config.enabled) {
        throw ErrorService.serviceUnavailable("Extension is disabled", {
          extension: this.name,
          status: this.status,
          source: "echo-extension",
        })
      }

      // Validate params type
      if (params === null || typeof params !== "object") {
        throw ErrorService.invalidParams("Invalid params: must be an object", undefined, {
          receivedType: typeof params,
          source: "echo-extension",
        })
      }

      // Check for unknown parameters
      const allowedParams = new Set(["message"])
      const receivedParams = Object.keys(params)
      const unknownParams = receivedParams.filter((param) => !allowedParams.has(param))
      if (unknownParams.length > 0) {
        throw ErrorService.invalidParams(
          `Invalid params: unknown parameter(s) '${unknownParams.join(", ")}'`,
          undefined,
          {
            unknownParams,
            allowedParams: Array.from(allowedParams),
            source: "echo-extension",
          },
        )
      }

      // Validate message parameter
      const { message } = params
      if (typeof message !== "string") {
        throw ErrorService.invalidParams("Invalid params: message must be a string", undefined, {
          receivedType: typeof message,
          source: "echo-extension",
        })
      }

      return {
        message: `📣: ${message || ""}`,
        timestamp: new Date().toISOString(),
      }
    },

    ping: async (): Promise<PingResponse> => {
      if (!this.config.enabled) {
        throw ErrorService.serviceUnavailable("Extension is disabled", {
          extension: this.name,
          status: this.status,
          source: "echo-extension",
        })
      }

      return {
        pong: true,
        timestamp: new Date().toISOString(),
      }
    },
  }
}
