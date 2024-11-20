import { RPCPlugins } from "../../interfaces/rpc.interface"
import { ValidatePortArguments, ValidatePortResponse } from "./interfaces"

export default class NetworkPlugin implements RPCPlugins {
  name = "network"
  version = "1.0"

  methods = {
    validatePort: (params: ValidatePortArguments): ValidatePortResponse => {
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
